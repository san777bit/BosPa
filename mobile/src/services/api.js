import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Адрес бэкенда BosPa. На телефоне localhost — сам телефон, поэтому для Expo Go
// в mobile/.env задаётся адрес компьютера в локальной сети, например http://192.168.1.10:8080
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN_KEY = 'bospa_device_token';

// expo-secure-store не работает в вебе — там токен хранится в localStorage
const tokenStore = {
  async get() {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(TOKEN_KEY);
      } catch (e) {
        return null;
      }
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token) {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(TOKEN_KEY, token);
      } catch (e) {
        // приватный режим: токен проживёт до перезагрузки страницы
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let token = null;
let registering = null;

async function registerDevice() {
  const res = await fetch(`${API_URL}/api/devices`, { method: 'POST' });
  if (!res.ok) throw new ApiError(res.status, `register: HTTP ${res.status}`);
  const body = await res.json();
  token = body.token;
  await tokenStore.set(token);
  return token;
}

// Токен устройства: из хранилища, а при первом запуске — новый с сервера
async function ensureToken() {
  if (token) return token;
  token = await tokenStore.get();
  if (token) return token;
  if (!registering) {
    registering = registerDevice().finally(() => {
      registering = null;
    });
  }
  return registering;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const auth = await ensureToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry) {
    // Сервер не знает токен (например, база пересоздана) — регистрируемся заново
    token = null;
    await registerDevice();
    return request(path, { method, body, retry: false });
  }
  if (!res.ok) throw new ApiError(res.status, `${method} ${path}: HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const q = (routeId, dirId) => `route=${encodeURIComponent(routeId)}&dir=${encodeURIComponent(dirId)}`;

// Остановки направления без статуса: сразу после смены маршрута, пока сервер не ответил
export function stopsWithoutStatus(direction) {
  return direction.stops.map((stop) => ({
    stop_id: stop.id,
    name: stop.name,
    lat: stop.lat,
    lon: stop.lon,
    s: stop.s,
    level: null,
    count: 0,
    eta_s: null,
    vehicle_id: null,
  }));
}

export const Api = {
  // Маршруты в формате приложения: линия — [lat, lon], как ждёт Leaflet (сервер отдаёт GeoJSON [lon, lat])
  async getRoutes() {
    const routes = await request('/api/routes');
    return routes.map((r) => ({
      ...r,
      directions: r.directions.map((d) => ({
        ...d,
        line: d.line.map(([lon, lat]) => [lat, lon]),
      })),
    }));
  },

  getVehicles(routeId, dirId) {
    return request(`/api/vehicles?${q(routeId, dirId)}`);
  },

  // Статусы остановок вместе с названиями и координатами из маршрута
  async getStopsStatus(direction, routeId) {
    const statuses = await request(`/api/stops/status?${q(routeId, direction.id)}`);
    const byId = new Map(statuses.map((s) => [s.stop_id, s]));
    return stopsWithoutStatus(direction).map((stop) => ({ ...stop, ...byId.get(stop.stop_id) }));
  },

  getMe() {
    return request('/api/me');
  },

  sendLocation(lat, lon) {
    return request('/api/location', { method: 'POST', body: { lat, lon } });
  },

  // { accepted, rewarded, points, balance, reasons, vehicle_id }
  submitCheckin(routeId, dirId, stopId, level) {
    return request('/api/checkins', {
      method: 'POST',
      body: { route: routeId, dir: dirId, stop_id: stopId, level },
    });
  },
};
