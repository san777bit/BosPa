"use strict";

const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const POLL_MS = 5000;
const LEVELS = [
  { badge: "🟢 Свободно", hint: "Есть сидячие места" },
  { badge: "🟡 Плотненько", hint: "Только стоя, но свободно" },
  { badge: "🔴 Не влезешь", hint: "Салон забит" },
];
const LEVEL_COLORS = ["#2fb344", "#f2a900", "#e03131"];
const SOURCE_TEXT = { official: "GPS", fused: "GPS + пассажиры", crowd: "по пассажирам BosPa" };

const state = {
  routes: [],
  route: null,
  dir: null,
  statuses: new Map(),   // stop_id -> status
  vehicles: new Map(),   // vehicle id -> data
  markers: new Map(),    // vehicle id -> maplibregl.Marker
  selected: null,        // { kind: "stop" | "vehicle", id }
  timer: null,
};

async function api(path) {
  const res = await fetch(path, { headers: { "X-Telegram-Init-Data": tg?.initData ?? "" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 4000);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// --- карта -------------------------------------------------------------------

let map;

async function init() {
  const cfg = await fetch("/api/config").then((r) => r.json());
  map = new maplibregl.Map({
    container: "map",
    style: cfg.map_style_url,
    center: [76.93, 43.24],
    zoom: 12,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "bottom-right");

  try {
    state.routes = await api("/api/routes");
  } catch (e) {
    toast("Не удалось загрузить маршруты. Откройте карту из бота.");
    throw e;
  }
  await new Promise((resolve) => (map.loaded() ? resolve() : map.on("load", resolve)));
  addLayers();
  renderRouteChips();
  selectRoute(state.routes[0].id);
}

function addLayers() {
  map.addSource("line", { type: "geojson", data: emptyFc() });
  map.addSource("stops", { type: "geojson", data: emptyFc() });
  map.addLayer({
    id: "line-casing", type: "line", source: "line",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#ffffff", "line-width": 9 },
  });
  map.addLayer({
    id: "line", type: "line", source: "line",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#2481cc", "line-width": 5 },
  });
  map.addLayer({
    id: "stops", type: "circle", source: "stops",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 9],
      "circle-color": ["match", ["get", "level"], 0, LEVEL_COLORS[0], 1, LEVEL_COLORS[1], 2, LEVEL_COLORS[2], "#9aa0a6"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.on("click", "stops", (e) => select({ kind: "stop", id: e.features[0].properties.id }));
  map.on("mouseenter", "stops", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "stops", () => (map.getCanvas().style.cursor = ""));
}

const emptyFc = () => ({ type: "FeatureCollection", features: [] });

function currentDirection() {
  return state.routes.find((r) => r.id === state.route)?.directions.find((d) => d.id === state.dir);
}

// --- выбор маршрута ------------------------------------------------------------

function chip(text, selected, onClick) {
  const b = document.createElement("button");
  b.className = "chip";
  b.textContent = text;
  b.setAttribute("role", "tab");
  b.setAttribute("aria-selected", String(selected));
  b.onclick = onClick;
  return b;
}

function renderRouteChips() {
  const box = document.getElementById("routes");
  box.replaceChildren(...state.routes.map((r) => chip(
    (r.kind === "trolleybus" ? "🚎 " : "🚌 ") + r.short, r.id === state.route, () => selectRoute(r.id))));
}

function renderDirChips() {
  const route = state.routes.find((r) => r.id === state.route);
  const box = document.getElementById("dirs");
  box.replaceChildren(...route.directions.map((d) => chip(d.title, d.id === state.dir, () => selectDir(d.id))));
}

function selectRoute(id) {
  state.route = id;
  renderRouteChips();
  const route = state.routes.find((r) => r.id === id);
  if (!route.verified) toast("Данные этого маршрута ещё проверяются");
  selectDir(route.directions[0].id);
}

function selectDir(id) {
  state.dir = id;
  renderDirChips();
  closeSheet();
  clearVehicles();
  state.statuses.clear();
  const d = currentDirection();
  map.getSource("line").setData({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: d.line }, properties: {} }],
  });
  renderStops();
  const bounds = d.line.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(d.line[0], d.line[0]));
  map.fitBounds(bounds, { padding: { top: 110, bottom: 40, left: 30, right: 30 }, duration: 600 });
  restartPolling();
}

// --- живые данные -------------------------------------------------------------

function restartPolling() {
  clearTimeout(state.timer);
  poll();
}

async function poll() {
  const route = state.route, dir = state.dir;
  const q = `route=${encodeURIComponent(route)}&dir=${encodeURIComponent(dir)}`;
  try {
    const [statuses, vehicles] = await Promise.all([api(`/api/stops/status?${q}`), api(`/api/vehicles?${q}`)]);
    if (route !== state.route || dir !== state.dir) return; // пользователь уже переключился
    state.statuses = new Map(statuses.map((s) => [s.stop_id, s]));
    state.vehicles = new Map(vehicles.map((v) => [v.id, v]));
    renderStops();
    renderVehicles();
    if (state.selected) renderSheet();
  } catch (e) {
    console.warn(e);
  }
  state.timer = setTimeout(poll, POLL_MS);
}

function renderStops() {
  const d = currentDirection();
  map.getSource("stops").setData({
    type: "FeatureCollection",
    features: d.stops.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { id: s.id, level: state.statuses.get(s.id)?.level ?? -1 },
    })),
  });
}

function clearVehicles() {
  state.markers.forEach((m) => m.remove());
  state.markers.clear();
  state.vehicles.clear();
}

function renderVehicles() {
  for (const [id, m] of state.markers) {
    if (!state.vehicles.has(id)) { m.remove(); state.markers.delete(id); }
  }
  const route = state.routes.find((r) => r.id === state.route);
  for (const v of state.vehicles.values()) {
    let m = state.markers.get(v.id);
    if (!m) {
      const el = document.createElement("div");
      el.innerHTML = `<span class="arrow"></span><span class="icon"></span><span class="riders" hidden></span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); select({ kind: "vehicle", id: v.id }); });
      m = new maplibregl.Marker({ element: el }).setLngLat([v.lon, v.lat]).addTo(map);
      state.markers.set(v.id, m);
    }
    const el = m.getElement();
    el.className = ["vehicle", v.source === "crowd" && "crowd", v.stale && "stale", v.level != null && `l${v.level}`]
      .filter(Boolean).join(" ");
    el.querySelector(".icon").textContent = route.kind === "trolleybus" ? "🚎" : "🚌";
    el.querySelector(".arrow").style.transform = `rotate(${v.bearing}deg)`;
    const riders = el.querySelector(".riders");
    riders.hidden = !v.riders;
    riders.textContent = `👥${v.riders}`;
    m.setLngLat([v.lon, v.lat]);
  }
}

// --- карточка -------------------------------------------------------------------

function select(sel) {
  state.selected = sel;
  renderSheet();
}

function closeSheet() {
  state.selected = null;
  document.getElementById("sheet").hidden = true;
}

document.getElementById("sheet-close").onclick = closeSheet;

function levelBadge(level) {
  return level == null || level < 0
    ? `<span class="badge none">⚪️ Нет данных</span>`
    : `<span class="badge l${level}">${LEVELS[level].badge}</span>`;
}

function vehicleSource(v) {
  let s = SOURCE_TEXT[v.source] ?? v.source;
  if (v.ext_id) s = `борт ${esc(v.ext_id)}, ${s}`;
  if (v.stale) s += `, данные ${v.age_s} с назад`;
  return s;
}

function renderSheet() {
  const sel = state.selected;
  const body = document.getElementById("sheet-body");
  const d = currentDirection();
  let html = "";

  if (sel.kind === "stop") {
    const stop = d.stops.find((s) => s.id === sel.id);
    const st = state.statuses.get(sel.id);
    if (!stop) return closeSheet();
    const v = st?.vehicle_id ? state.vehicles.get(st.vehicle_id) : null;
    const eta = st?.eta_s == null ? null : st.eta_s < 60 ? "подъезжает" : `~${Math.round(st.eta_s / 60)} мин`;
    html = `<h2>${esc(stop.name)}</h2>
      <p>${levelBadge(st?.level)} ${st?.level != null ? `<span class="hint">${LEVELS[st.level].hint}</span>` : ""}</p>
      <p>⏱ ${eta && v ? `Прибытие: <b>${eta}</b> <span class="hint">(${vehicleSource(v)})</span>` : "Подъезжающих бортов пока не видно"}</p>
      <p class="hint">${st && st.count
        ? `На основе ${st.count} отметок ${st.by_vehicle ? "по этому борту" : "на участке"} за 15 минут`
        : "Отметьтесь в боте первым — +10 B"}</p>`;
  } else {
    const v = state.vehicles.get(sel.id);
    if (!v) return closeSheet();
    html = `<h2>${v.ext_id ? `Борт ${esc(v.ext_id)}` : "Борт по данным пассажиров"}</h2>
      <p>${levelBadge(v.level)}</p>
      <p>🚀 ${Math.round(v.speed_kmh)} км/ч <span class="hint">· ${vehicleSource(v)}</span></p>
      ${v.riders ? `<p>👥 В салоне пассажиров BosPa: ${v.riders}</p>` : ""}
      <p class="hint">${v.level_count ? `Загруженность по ${v.level_count} отметкам за 15 минут` : "Отметок по этому борту пока нет"}</p>`;
  }
  body.innerHTML = html;
  document.getElementById("sheet").hidden = false;
}

init().catch((e) => console.error(e));
