import routesData from '../data/routes.json';

// Haversine distance in meters
function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Precompute cumulative line distances
function prepareLine(line) {
  const cumDist = [0];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const d = haversineDist(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
    total += d;
    cumDist.push(total);
  }
  return { line, cumDist, totalLength: total };
}

// Calculate bearing between two points in degrees
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Interpolate point at distance s along the line
function pointAtDistance(prepared, s) {
  const { line, cumDist, totalLength } = prepared;
  if (totalLength === 0) return { lat: line[0][0], lon: line[0][1], bearing: 0 };
  const wrappedS = ((s % totalLength) + totalLength) % totalLength;

  // Binary search for segment
  let low = 0;
  let high = cumDist.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (cumDist[mid] <= wrappedS) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const idx = Math.max(0, high);
  const nextIdx = Math.min(line.length - 1, idx + 1);

  if (idx === nextIdx) {
    return { lat: line[idx][0], lon: line[idx][1], bearing: 0 };
  }

  const segDist = cumDist[nextIdx] - cumDist[idx];
  const t = segDist > 0 ? (wrappedS - cumDist[idx]) / segDist : 0;

  const lat = line[idx][0] + (line[nextIdx][0] - line[idx][0]) * t;
  const lon = line[idx][1] + (line[nextIdx][1] - line[idx][1]) * t;
  const bearing = getBearing(line[idx][0], line[idx][1], line[nextIdx][0], line[nextIdx][1]);

  return { lat, lon, bearing };
}

// Internal simulator state
const processedLines = new Map();
const simulatedVehicles = new Map();
const simulatedCheckins = new Map();

// Initialize simulated vehicles
function initSimulation() {
  routesData.routes.forEach((route) => {
    route.directions.forEach((dir) => {
      const key = `${route.id}_${dir.id}`;
      const prep = prepareLine(dir.line);
      processedLines.set(key, prep);

      // Create 3-4 realistic vehicles per direction
      const count = route.kind === 'trolleybus' ? 4 : 5;
      const vehicles = [];
      for (let i = 0; i < count; i++) {
        const fraction = (i / count) + (i * 0.07);
        const speed = 7.5 + (i % 3) * 1.2; // 27 - 35 km/h
        const initialOccupancy = i % 3; // 0, 1, or 2
        vehicles.push({
          id: `veh_${key}_${i + 1}`,
          ext_id: `${route.short}-${101 + i * 4}`,
          route_id: route.id,
          dir_id: dir.id,
          s: (fraction * prep.totalLength) % prep.totalLength,
          speed_mps: speed,
          speed_kmh: Math.round(speed * 3.6),
          level: initialOccupancy,
          level_count: 5 + (i * 3),
          riders: 1 + (i % 4),
          source: i % 2 === 0 ? 'fused' : 'crowd',
          lastUpdate: Date.now(),
        });
      }
      simulatedVehicles.set(key, vehicles);
    });
  });
}

initSimulation();

let lastTickTime = Date.now();

export const TransitService = {
  getRoutes() {
    return routesData.routes;
  },

  getRoute(routeId) {
    return routesData.routes.find((r) => r.id === routeId) || routesData.routes[0];
  },

  getDirection(routeId, dirId) {
    const route = this.getRoute(routeId);
    return route.directions.find((d) => d.id === dirId) || route.directions[0];
  },

  // Updates vehicle positions and returns current state
  getLiveVehicles(routeId, dirId) {
    const key = `${routeId}_${dirId}`;
    const prep = processedLines.get(key);
    const list = simulatedVehicles.get(key) || [];
    if (!prep) return [];

    const now = Date.now();
    const dt = Math.min((now - lastTickTime) / 1000, 2.0);
    lastTickTime = now;

    return list.map((v) => {
      v.s = (v.s + v.speed_mps * dt) % prep.totalLength;
      const pos = pointAtDistance(prep, v.s);
      return {
        ...v,
        lat: pos.lat,
        lon: pos.lon,
        bearing: pos.bearing,
      };
    });
  },

  // Calculates statuses and ETAs for all stops along the direction
  getStopsStatus(routeId, dirId, vehicles = []) {
    const key = `${routeId}_${dirId}`;
    const dir = this.getDirection(routeId, dirId);
    const prep = processedLines.get(key);
    if (!dir || !prep) return [];

    return dir.stops.map((stop, stopIdx) => {
      // Find approximate distance of stop along line
      const stopDist = (stopIdx / dir.stops.length) * prep.totalLength;

      // Find closest approaching vehicle
      let closestVeh = null;
      let minDelta = Infinity;

      vehicles.forEach((veh) => {
        let delta = stopDist - veh.s;
        if (delta < 0) delta += prep.totalLength;
        if (delta < minDelta) {
          minDelta = delta;
          closestVeh = veh;
        }
      });

      const etaSeconds = closestVeh ? Math.round(minDelta / closestVeh.speed_mps) : null;
      const userCheckin = simulatedCheckins.get(`${key}_${stop.id}`);

      const level = userCheckin !== undefined ? userCheckin.level : closestVeh ? closestVeh.level : (stopIdx % 3);
      const count = userCheckin ? userCheckin.count : (closestVeh ? closestVeh.level_count : 3);

      return {
        stop_id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        level,
        count,
        eta_s: etaSeconds,
        vehicle_id: closestVeh ? closestVeh.id : null,
        vehicle_ext_id: closestVeh ? closestVeh.ext_id : null,
      };
    });
  },

  // Submit passenger feedback / crowd checkin
  submitCheckin(routeId, dirId, stopId, level) {
    const key = `${routeId}_${dirId}`;
    const checkinKey = `${key}_${stopId}`;
    const existing = simulatedCheckins.get(checkinKey) || { level, count: 0 };

    simulatedCheckins.set(checkinKey, {
      level,
      count: existing.count + 1,
      timestamp: Date.now(),
    });

    // Also update any nearby vehicle
    const vehicles = simulatedVehicles.get(key) || [];
    if (vehicles.length > 0) {
      vehicles[0].level = level;
      vehicles[0].level_count = (vehicles[0].level_count || 1) + 1;
      vehicles[0].riders = (vehicles[0].riders || 1) + 1;
    }

    return {
      success: true,
      pointsEarned: 10,
      newLevel: level,
      message: 'Спасибо за вклад! Вам начислено +10 баллов BosPa',
    };
  },
};
