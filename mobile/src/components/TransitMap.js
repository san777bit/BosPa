import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';

let WebView;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView not loaded:', e);
  }
}

function generateInitialMapHtml(initialIsDark = false) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #eef2f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; transition: background 0.3s ease; }

    .leaflet-control-attribution { font-size: 9px !important; background: #ffffff !important; border: 1.5px solid #111111; border-radius: 6px; padding: 1px 5px !important; }

    /* Dark theme overrides */
    body.dark-theme, body.dark-theme #map { background: #0B1120 !important; }
    body.dark-theme .leaflet-tile {
      filter: invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%);
    }
    body.dark-theme .leaflet-control-attribution {
      background: rgba(15,23,42,0.8) !important;
      color: #94A3B8 !important;
    }
    body.dark-theme .leaflet-control-attribution a {
      color: #38BDF8 !important;
    }
    body.dark-theme .stop-label {
      background: #272B34 !important;
      color: #F4F4F5 !important;
    }

    /* Custom Stop Marker */
    .stop-marker-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .stop-marker-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2.5px solid #111111;
      background-color: #E5E7EB;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .stop-marker-dot.active {
      transform: scale(1.5);
      box-shadow: 2px 2px 0 #111111;
    }
    .stop-label {
      position: absolute;
      left: 20px;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 800;
      color: #111111;
      background: #ffffff;
      border: 2px solid #111111;
      padding: 1px 6px;
      border-radius: 8px;
      pointer-events: none;
      display: none;
    }
    .leaflet-zoom-animated .stop-marker-wrap.show-label .stop-label {
      display: block;
    }

    /* Custom Bus Marker */
    .bus-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }
    .bus-card {
      background: #F9A8D4;
      border: 2.5px solid #111111;
      border-radius: 10px;
      padding: 2px 7px;
      box-shadow: 3px 3px 0 #111111;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: #111111;
      white-space: nowrap;
      transition: transform 0.2s ease;
    }
    /* Тип транспорта (роль transit из theme.js) */
    .bus-card.kind-trolleybus { background: #7CC8FF; }
    .bus-card.kind-bus { background: #F9A8D4; }
    .bus-card:hover, .bus-card.selected {
      transform: scale(1.15);
    }
    .bus-kind-pill {
      font-size: 9px;
      font-weight: 900;
      color: #ffffff;
      background: #111111;
      padding: 1px 4px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bus-num {
      font-family: 'Unbounded', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 900;
      color: #111111;
    }
    .bus-crowd-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #111111;
      background-color: #E5E7EB;
    }
    .bus-arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 7px solid #111111;
      margin-top: 1px;
      transition: transform 0.4s ease;
    }
    .bus-riders-badge {
      font-size: 9px;
      color: #111111;
      background: #ffffff;
      border: 1.5px solid #111111;
      padding: 0 4px;
      border-radius: 999px;
      font-weight: 800;
    }

    /* Occupancy colors (levelColors из theme.js) */
    .lvl-0 { background-color: #4ADE80 !important; }
    .lvl-1 { background-color: #FFB547 !important; }
    .lvl-2 { background-color: #FF6B6B !important; }
    .lvl-none { background-color: #E5E7EB !important; }
  </style>
</head>
<body class="${initialIsDark ? 'dark-theme' : ''}">
  <div id="map"></div>
  <script>
    let routeKind = "bus";
    let routeShort = "";

    // Initialize Leaflet Map centered on Almaty
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([43.2567, 76.9286], 13);

    // Official Free OpenStreetMap raster tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let routeLineCasing = null;
    let routeLine = null;
    let stopMarkers = {};
    let vehicleMarkers = {};
    let selectedStopId = null;
    let selectedVehId = null;

    function sendMessage(type, data) {
      const payload = JSON.stringify({ type, data });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(payload, '*');
      }
    }

    function getLevelClass(lvl) {
      if (lvl === 0) return 'lvl-0';
      if (lvl === 1) return 'lvl-1';
      if (lvl === 2) return 'lvl-2';
      return 'lvl-none';
    }

    // Completely replace route geometry and stops
    function setRoute(data) {
      routeKind = (data.route && data.route.kind) || 'bus';
      routeShort = (data.route && data.route.short) || '';
      selectedStopId = null;
      selectedVehId = null;

      // 1. Clear all old stop markers completely
      Object.keys(stopMarkers).forEach(id => {
        map.removeLayer(stopMarkers[id]);
      });
      stopMarkers = {};

      // 2. Clear all old vehicle markers completely
      Object.keys(vehicleMarkers).forEach(id => {
        map.removeLayer(vehicleMarkers[id]);
      });
      vehicleMarkers = {};

      // 3. Remove old route polyline
      if (routeLineCasing) {
        map.removeLayer(routeLineCasing);
        routeLineCasing = null;
      }
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }

      // 4. Draw new polyline if provided
      const lineData = data.direction && data.direction.line;
      if (lineData && lineData.length > 0) {
        routeLineCasing = L.polyline(lineData, {
          color: '#111111',
          weight: 9,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        routeLine = L.polyline(lineData, {
          color: routeKind === 'trolleybus' ? '#7CC8FF' : '#F9A8D4',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Fit map bounds to the new route
        const bounds = L.latLngBounds(lineData);
        map.fitBounds(bounds, { padding: [40, 40], animate: true });
      }

      // 5. Render new stops
      if (data.stops && data.stops.length > 0) {
        renderStops(data.stops);
      }

      // 6. Render new vehicles
      if (data.vehicles && data.vehicles.length > 0) {
        renderVehicles(data.vehicles);
      }
    }

    // Render stops: updates existing, creates new, and REMOVES old stops from other routes!
    function renderStops(stops) {
      if (!stops) return;
      const activeStopIds = new Set(stops.map(s => String(s.stop_id || s.id)));

      // Remove any marker not belonging to the current route's stops
      Object.keys(stopMarkers).forEach(id => {
        if (!activeStopIds.has(String(id))) {
          map.removeLayer(stopMarkers[id]);
          delete stopMarkers[id];
        }
      });

      stops.forEach(s => {
        const id = String(s.stop_id || s.id);
        const lvlClass = getLevelClass(s.level);
        const isSelected = id === String(selectedStopId);

        if (stopMarkers[id]) {
          // Update existing marker dot class
          const el = stopMarkers[id].getElement();
          if (el) {
            const dot = el.querySelector('.stop-marker-dot');
            if (dot) {
              dot.className = 'stop-marker-dot ' + lvlClass + (isSelected ? ' active' : '');
            }
          }
        } else {
          // Create new stop marker
          const html = '<div class="stop-marker-wrap ' + (map.getZoom() >= 14 ? 'show-label' : '') + '">' +
            '<div class="stop-marker-dot ' + lvlClass + ' ' + (isSelected ? 'active' : '') + '"></div>' +
            '<div class="stop-label">' + s.name + '</div>' +
          '</div>';

          const icon = L.divIcon({
            className: '',
            html: html,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const marker = L.marker([s.lat, s.lon], { icon: icon, zIndexOffset: 100 })
            .addTo(map)
            .on('click', function(e) {
              L.DomEvent.stopPropagation(e);
              selectedStopId = id;
              selectedVehId = null;
              updateStopsHighlight();
              sendMessage('SELECT_STOP', s);
            });

          stopMarkers[id] = marker;
        }
      });
    }

    function updateStopsHighlight() {
      Object.keys(stopMarkers).forEach(stopId => {
        const marker = stopMarkers[stopId];
        const el = marker.getElement();
        if (el) {
          const dot = el.querySelector('.stop-marker-dot');
          if (dot) {
            if (String(stopId) === String(selectedStopId)) {
              dot.classList.add('active');
            } else {
              dot.classList.remove('active');
            }
          }
        }
      });
    }

    // Smoothly update vehicles
    function renderVehicles(vehicles) {
      if (!vehicles) return;
      const activeIds = new Set(vehicles.map(v => String(v.id)));

      // Remove inactive vehicles
      Object.keys(vehicleMarkers).forEach(id => {
        if (!activeIds.has(String(id))) {
          map.removeLayer(vehicleMarkers[id]);
          delete vehicleMarkers[id];
        }
      });

      const kindText = routeKind === 'trolleybus' ? 'ТБ' : 'АВТ';

      vehicles.forEach(v => {
        const id = String(v.id);
        const lvlClass = getLevelClass(v.level);
        const isSelected = id === String(selectedVehId);

        if (vehicleMarkers[id]) {
          const marker = vehicleMarkers[id];
          marker.setLatLng([v.lat, v.lon]);

          const el = marker.getElement();
          if (el) {
            const arrow = el.querySelector('.bus-arrow');
            if (arrow) arrow.style.transform = 'rotate(' + (v.bearing || 0) + 'deg)';
            const card = el.querySelector('.bus-card');
            if (card) {
              if (isSelected) card.classList.add('selected');
              else card.classList.remove('selected');
            }
            const dot = el.querySelector('.bus-crowd-dot');
            if (dot) dot.className = 'bus-crowd-dot ' + lvlClass;
            const ridersBadge = el.querySelector('.bus-riders-badge');
            if (ridersBadge) {
              ridersBadge.textContent = (v.riders || '') + 'п';
            }
          }
        } else {
          const html = '<div class="bus-marker-wrap">' +
            '<div class="bus-card kind-' + routeKind + ' ' + (isSelected ? 'selected' : '') + '">' +
              '<span class="bus-kind-pill">' + kindText + '</span>' +
              '<span class="bus-num">' + routeShort + '</span>' +
              '<div class="bus-crowd-dot ' + lvlClass + '"></div>' +
              (v.riders ? '<span class="bus-riders-badge">' + v.riders + 'п</span>' : '') +
            '</div>' +
            '<div class="bus-arrow" style="transform: rotate(' + (v.bearing || 0) + 'deg);"></div>' +
          '</div>';

          const icon = L.divIcon({
            className: '',
            html: html,
            iconSize: [68, 40],
            iconAnchor: [34, 20]
          });

          const marker = L.marker([v.lat, v.lon], { icon: icon, zIndexOffset: 500 })
            .addTo(map)
            .on('click', function(e) {
              L.DomEvent.stopPropagation(e);
              selectedVehId = id;
              selectedStopId = null;
              updateStopsHighlight();
              sendMessage('SELECT_VEHICLE', v);
            });

          vehicleMarkers[id] = marker;
        }
      });
    }

    map.on('click', function() {
      selectedStopId = null;
      selectedVehId = null;
      updateStopsHighlight();
      sendMessage('DESELECT', {});
    });

    map.on('zoomend', function() {
      const z = map.getZoom();
      const wraps = document.querySelectorAll('.stop-marker-wrap');
      wraps.forEach(w => {
        if (z >= 14) w.classList.add('show-label');
        else w.classList.remove('show-label');
      });
    });

    // Notify React Native that map is ready
    sendMessage('MAP_READY', {});

    // Listen to parent commands
    window.addEventListener('message', function(event) {
      try {
        let msg = event.data;
        if (typeof msg === 'string') {
          msg = JSON.parse(msg);
        }
        if (msg.action === 'SET_THEME') {
          if (msg.isDark) {
            document.body.classList.add('dark-theme');
          } else {
            document.body.classList.remove('dark-theme');
          }
        } else if (msg.action === 'SET_ROUTE') {
          setRoute(msg);
        } else if (msg.action === 'UPDATE_VEHICLES') {
          renderVehicles(msg.vehicles);
        } else if (msg.action === 'UPDATE_STOPS') {
          renderStops(msg.stops);
        } else if (msg.action === 'FIT_ROUTE') {
          if (routeLine) {
            // Карта могла получить маршрут скрытой (вкладка не открыта) — пересчитать размер
            map.invalidateSize();
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50], animate: true });
          }
        } else if (msg.action === 'FLY_TO') {
          map.flyTo([msg.lat, msg.lon], msg.zoom || 16, { duration: 0.8 });
        } else if (msg.action === 'ZOOM_IN') {
          map.zoomIn();
        } else if (msg.action === 'ZOOM_OUT') {
          map.zoomOut();
        }
      } catch (err) {
        console.error('Map message error:', err);
      }
    });
  </script>
</body>
</html>
  `;
}

export default function TransitMap({
  route,
  direction,
  stopsWithStatus,
  vehicles,
  isDark = false,
  onSelectStop,
  onSelectVehicle,
  onDeselect,
  mapRef,
}) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);
  const isMapReady = useRef(false);

  const html = useMemo(() => generateInitialMapHtml(isDark), []);

  const sendToMap = (payloadObj) => {
    const payload = JSON.stringify(payloadObj);
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('map-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(payload, '*');
      }
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(payload);
    }
  };

  // Маршрут для карты: остановки и борта только этого направления. В props они могут быть
  // ещё от прошлого маршрута — App получает новые данные чуть позже, чем меняется маршрут.
  const routeMessage = () => {
    const stopIds = new Set((direction?.stops || []).map((s) => s.id));
    return {
      action: 'SET_ROUTE',
      route,
      direction,
      stops: (stopsWithStatus || []).filter((s) => stopIds.has(s.stop_id)),
      vehicles: (vehicles || []).filter((v) => v.route === route?.id && v.dir === direction?.id),
    };
  };

  const handleMessage = (event) => {
    try {
      let data = event.nativeEvent ? event.nativeEvent.data : event.data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      if (data.type === 'MAP_READY') {
        isMapReady.current = true;
        setLoading(false);
        sendToMap({
          action: 'SET_THEME',
          isDark,
        });
        sendToMap(routeMessage());
      } else if (data.type === 'SELECT_STOP') {
        onSelectStop && onSelectStop(data.data);
      } else if (data.type === 'SELECT_VEHICLE') {
        onSelectVehicle && onSelectVehicle(data.data);
      } else if (data.type === 'DESELECT') {
        onDeselect && onDeselect();
      }
    } catch (e) {
      console.warn('Handle message error:', e);
    }
  };

  // Sync theme changes to map dynamically without reload
  useEffect(() => {
    if (isMapReady.current) {
      sendToMap({ action: 'SET_THEME', isDark });
    }
  }, [isDark]);

  // When route or direction changes
  useEffect(() => {
    if (isMapReady.current) {
      sendToMap(routeMessage());
    }
  }, [route?.id, direction?.id]);

  // Periodic vehicle positions update
  useEffect(() => {
    if (isMapReady.current && vehicles) {
      sendToMap({ action: 'UPDATE_VEHICLES', vehicles });
    }
  }, [vehicles]);

  // Periodic stops status update
  useEffect(() => {
    if (isMapReady.current && stopsWithStatus) {
      sendToMap({ action: 'UPDATE_STOPS', stops: stopsWithStatus });
    }
  }, [stopsWithStatus]);

  if (mapRef) {
    mapRef.current = {
      updateVehicles: (newVehicles) => {
        sendToMap({ action: 'UPDATE_VEHICLES', vehicles: newVehicles });
      },
      updateStops: (newStops) => {
        sendToMap({ action: 'UPDATE_STOPS', stops: newStops });
      },
      fitRoute: () => {
        sendToMap({ action: 'FIT_ROUTE' });
      },
      flyTo: (lat, lon, zoom = 16) => {
        sendToMap({ action: 'FLY_TO', lat, lon, zoom });
      },
      zoomIn: () => {
        sendToMap({ action: 'ZOOM_IN' });
      },
      zoomOut: () => {
        sendToMap({ action: 'ZOOM_OUT' });
      },
    };
  }

  const handleMessageRef = useRef(handleMessage);
  handleMessageRef.current = handleMessage;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const listener = (event) => handleMessageRef.current(event);
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }
  }, []);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          id="map-iframe"
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
        />
      ) : WebView ? (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={false}
        />
      ) : null}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.ink} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  map: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
