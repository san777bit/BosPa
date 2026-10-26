// Ближайшая остановка и все маршруты, которые через неё идут.
// Одна физическая остановка в данных — несколько записей (по одной на каждое направление),
// поэтому соседние записи собираются в группу по расстоянию и названию.

const SAME_STOP_M = 150;       // записи ближе этого — одна остановка
const SAME_NAME_STOP_M = 400;  // та же остановка через дорогу может стоять дальше

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function allEntries(routes) {
  const out = [];
  routes.forEach((route) =>
    route.directions.forEach((direction) =>
      direction.stops.forEach((stop) => out.push({ route, direction, stop })),
    ),
  );
  return out;
}

// Остановка, через которую идёт больше всего направлений, — показываем её, пока нет геопозиции
function busiestStop(entries) {
  const dirsByName = new Map();
  entries.forEach(({ direction, stop }) => {
    const set = dirsByName.get(stop.name) || new Set();
    set.add(direction);
    dirsByName.set(stop.name, set);
  });
  let best = null;
  dirsByName.forEach((set, name) => {
    if (!best || set.size > best.size) best = { name, size: set.size };
  });
  return entries.find((e) => e.stop.name === best.name).stop;
}

// { name, distanceM (null без геопозиции), entries: [{ route, direction, stop }] }
export function findNearbyStop(routes, location) {
  const entries = allEntries(routes);
  if (entries.length === 0) return null;

  let anchor;
  let distance = null;
  if (location) {
    let best = null;
    entries.forEach((e) => {
      const d = distanceM(location.lat, location.lon, e.stop.lat, e.stop.lon);
      if (!best || d < best.d) best = { stop: e.stop, d };
    });
    anchor = best.stop;
    distance = best.d;
  } else {
    anchor = busiestStop(entries);
  }

  // В каждом направлении — только одна, ближайшая к опорной, запись
  const byDirection = new Map();
  entries.forEach((e) => {
    const d = distanceM(anchor.lat, anchor.lon, e.stop.lat, e.stop.lon);
    const sameStop = d <= SAME_STOP_M || (e.stop.name === anchor.name && d <= SAME_NAME_STOP_M);
    if (!sameStop) return;
    const prev = byDirection.get(e.direction);
    if (!prev || d < prev.d) byDirection.set(e.direction, { ...e, d });
  });

  return {
    name: anchor.name,
    distanceM: distance,
    entries: [...byDirection.values()].map(({ route, direction, stop }) => ({ route, direction, stop })),
  };
}
