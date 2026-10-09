"""Привязка GPS-точек к линии маршрута и отсев шума."""

from dataclasses import dataclass

from bospa.domain.routes import Direction

MAX_OFFSET_M = 30.0
MIN_SPEED_KMH = 5.0
BACKTRACK_M = 50.0
MISS_LIMIT = 3
SEARCH_WINDOW_M = 1500.0
RING_WRAP_M = 300.0


@dataclass
class TrackState:
    s: float                # положение вдоль линии, м
    ts: float               # время последней хорошей точки
    speed_kmh: float
    valid: bool             # точку можно считать движущимся бортом
    misses: int = 0         # плохих точек подряд
    moving_seen: bool = False
    lat: float = 0.0
    lon: float = 0.0


def match(direction: Direction, lat: float, lon: float, ts: float, prev: TrackState | None) -> TrackState:
    """Новое состояние трека после очередной точки.

    Плохая точка — далеко от линии или заметное движение назад. После MISS_LIMIT
    плохих точек подряд трек перестаёт быть валидным. Пока не замечено движение
    быстрее MIN_SPEED_KMH, трек тоже не валиден: так отсекаются пешеходы,
    просто стоящие у дороги.
    """
    near = prev.s if prev else None
    proj = direction.line.project(lat, lon, near_s=near, window=SEARCH_WINDOW_M)
    if proj.offset > MAX_OFFSET_M and near is not None:
        # маршрут мог сделать петлю длиннее окна — проверяем всю линию
        proj = direction.line.project(lat, lon)

    if prev is None:
        good = proj.offset <= MAX_OFFSET_M
        return TrackState(proj.s, ts, 0.0, False, 0 if good else 1, False, lat, lon)

    length = direction.line.length
    wrapped = False
    if direction.ring and prev.s > length - RING_WRAP_M:
        # Кольцо: конечная — это одновременно конец и начало линии. Если борт уже
        # поехал на новый круг, точка лучше ложится на начало линии.
        head = direction.line.project(lat, lon, near_s=RING_WRAP_M / 2, window=RING_WRAP_M / 2)
        if head.offset <= MAX_OFFSET_M and head.offset <= proj.offset + 1.0:
            proj, wrapped = head, True

    dt = ts - prev.ts
    ds = proj.s + (length - prev.s) if wrapped else proj.s - prev.s
    bad = proj.offset > MAX_OFFSET_M or ds < -BACKTRACK_M
    if bad:
        misses = prev.misses + 1
        return TrackState(prev.s, prev.ts, prev.speed_kmh, prev.moving_seen and misses < MISS_LIMIT,
                          misses, prev.moving_seen, prev.lat, prev.lon)

    speed = max(0.0, ds / dt * 3.6) if dt > 0 else prev.speed_kmh
    moving_seen = prev.moving_seen or speed >= MIN_SPEED_KMH
    # мелкий «откат» из-за дрожания GPS на остановке не двигает борт назад
    s = max(proj.s, prev.s) if ds < 0 and not wrapped else proj.s
    return TrackState(s, ts, speed, moving_seen, 0, moving_seen, lat, lon)
