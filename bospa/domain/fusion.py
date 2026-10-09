"""Слияние официальных GPS-данных (Б) и пассажиров BosPa (А) в один список бортов.

Всё сравнивается по s — положению вдоль линии направления, — а не по координатам:
так не путаются встречные направления и параллельные улицы.
"""

import uuid
from dataclasses import dataclass, field, replace
from typing import Callable

ATTACH_DIST_M = 150.0
SPEED_TOL_KMH = 10.0
ATTACH_STREAK = 3
DETACH_STREAK = 3
FRESH_S = 20.0
OFFICIAL_MAX_AGE_S = 180.0
CROWD_MAX_AGE_S = 60.0
CLUSTER_GAP_M = 100.0

OFFICIAL_PREFIX = "off:"
CROWD_PREFIX = "crowd:"


@dataclass(frozen=True)
class OfficialTrack:
    ext_id: str
    s: float
    speed_kmh: float
    ts: float

    @property
    def vehicle_id(self) -> str:
        return OFFICIAL_PREFIX + self.ext_id

    def s_at(self, t: float, length: float) -> float:
        return min(length, self.s + self.speed_kmh / 3.6 * max(0.0, t - self.ts))


@dataclass(frozen=True)
class CrowdTrack:
    user_id: int
    s: float
    speed_kmh: float
    ts: float
    valid: bool


@dataclass
class RideState:
    """Состояние пассажира между тиками слияния (хранится в ride:{uid})."""
    vehicle_id: str | None = None
    candidate: str | None = None
    match_streak: int = 0
    miss_streak: int = 0
    last_ts: float = 0.0


@dataclass
class Vehicle:
    id: str
    s: float
    speed_kmh: float
    source: str          # "official" | "fused" | "crowd"
    ts: float            # время данных, по которым построена позиция
    stale: bool
    ext_id: str | None = None
    riders: list[int] = field(default_factory=list)


def fuse(
    now: float,
    length: float,
    officials: list[OfficialTrack],
    crowd: list[CrowdTrack],
    rides: dict[int, RideState],
    official_available: bool,
    new_id: Callable[[], str] = lambda: uuid.uuid4().hex[:12],
) -> tuple[list[Vehicle], dict[int, RideState]]:
    """Один тик слияния для одного направления маршрута."""
    live_off = {t.vehicle_id: t for t in officials if now - t.ts <= OFFICIAL_MAX_AGE_S}
    crowd_by_uid = {c.user_id: c for c in crowd}
    new_rides: dict[int, RideState] = {}

    # 1. Привязка пассажиров к официальным бортам
    for c in crowd:
        r = replace(rides.get(c.user_id) or RideState())
        new_rides[c.user_id] = r
        if c.ts <= r.last_ts:
            continue  # новых точек от пассажира не было
        r.last_ts = c.ts
        best = _nearest_official(c, live_off, length) if c.valid else None
        if best is None:
            r.candidate, r.match_streak = None, 0
            r.miss_streak += 1
            if r.vehicle_id and r.vehicle_id.startswith(OFFICIAL_PREFIX) and r.miss_streak >= DETACH_STREAK:
                r.vehicle_id = None
            continue
        r.miss_streak = 0
        if best == r.candidate:
            r.match_streak += 1
        else:
            r.candidate, r.match_streak = best, 1
        if r.match_streak >= ATTACH_STREAK:
            r.vehicle_id = best

    # 2. Официальные борта
    vehicles: list[Vehicle] = []
    for vid, t in live_off.items():
        riders = [uid for uid, r in new_rides.items() if r.vehicle_id == vid]
        fresh_riders = [crowd_by_uid[u] for u in riders
                        if crowd_by_uid[u].valid and now - crowd_by_uid[u].ts <= FRESH_S]
        if now - t.ts <= FRESH_S:
            v = Vehicle(vid, t.s, t.speed_kmh, "official", t.ts, False, t.ext_id, riders)
        elif fresh_riders:
            c = max(fresh_riders, key=lambda x: x.ts)
            v = Vehicle(vid, c.s, c.speed_kmh, "fused", c.ts, False, t.ext_id, riders)
        else:
            v = Vehicle(vid, t.s_at(now, length), t.speed_kmh, "official", t.ts, True, t.ext_id, riders)
        vehicles.append(v)

    # 3. Пассажиры без привязки
    loose = [c for c in crowd
             if c.valid and now - c.ts <= CROWD_MAX_AGE_S
             and not (new_rides[c.user_id].vehicle_id or "").startswith(OFFICIAL_PREFIX)]
    if official_available:
        # Официальные данные по маршруту есть, а борта рядом нет — это не автобус
        # (другой маршрут, такси, ошибка). Не показываем.
        for c in loose:
            if new_rides[c.user_id].vehicle_id:
                new_rides[c.user_id].vehicle_id = None
    else:
        vehicles.extend(_crowd_vehicles(loose, new_rides, new_id))

    return vehicles, new_rides


def _nearest_official(c: CrowdTrack, live_off: dict[str, OfficialTrack], length: float) -> str | None:
    best, best_d = None, ATTACH_DIST_M
    for vid, t in live_off.items():
        d = abs(t.s_at(c.ts, length) - c.s)
        if d < best_d and abs(t.speed_kmh - c.speed_kmh) <= SPEED_TOL_KMH:
            best, best_d = vid, d
    return best


def _crowd_vehicles(loose: list[CrowdTrack], rides: dict[int, RideState],
                    new_id: Callable[[], str]) -> list[Vehicle]:
    """Склейка пассажиров, едущих рядом с одной скоростью, в «народные» борта."""
    groups: list[list[CrowdTrack]] = []
    for c in sorted(loose, key=lambda x: x.s):
        g = groups[-1] if groups else None
        if g and c.s - g[-1].s < CLUSTER_GAP_M and abs(c.speed_kmh - g[-1].speed_kmh) <= SPEED_TOL_KMH:
            g.append(c)
        else:
            groups.append([c])

    used: set[str] = set()
    vehicles = []
    for g in groups:
        # id борта стабилен между тиками: берём тот, что уже был у участников
        prev_ids = [rides[c.user_id].vehicle_id for c in g
                    if (rides[c.user_id].vehicle_id or "").startswith(CROWD_PREFIX)]
        prev_ids = [i for i in prev_ids if i not in used]
        vid = max(sorted(set(prev_ids)), key=prev_ids.count) if prev_ids else CROWD_PREFIX + new_id()
        used.add(vid)
        for c in g:
            rides[c.user_id].vehicle_id = vid
        vehicles.append(Vehicle(
            id=vid,
            s=sum(c.s for c in g) / len(g),
            speed_kmh=sum(c.speed_kmh for c in g) / len(g),
            source="crowd",
            ts=max(c.ts for c in g),
            stale=False,
            riders=[c.user_id for c in g],
        ))
    return vehicles
