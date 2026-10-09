"""Проверки, от которых зависит начисление баллов. Без Redis и БД — только логика."""

from dataclasses import dataclass

from bospa.domain.geo import haversine
from bospa.domain.routes import Direction, Stop
from bospa.domain.status import TRUST_NO_LOCATION, TRUST_OK

LOCATION_MAX_AGE_S = 5 * 60
LOCATION_MAX_DIST_M = 300.0
MAX_SPEED_KMH = 80.0
HOURLY_REWARD_LIMIT = 6

# Причины отказа в баллах (пишутся в checkins.reject_reason)
NO_LOCATION = "no_location"
FAR_FROM_STOP = "far_from_stop"
TOO_FAST = "too_fast"
HOURLY_LIMIT = "hourly_limit"
NO_OFFICIAL_VEHICLE = "no_official_vehicle"
BANNED = "banned"


@dataclass(frozen=True)
class Point:
    lat: float
    lon: float
    ts: float


def check_location(loc: Point | None, now: float, direction: Direction, stop: Stop,
                   in_ride: bool) -> tuple[float, str | None]:
    """Доверие к отметке и причина отказа, если геолокация её не подтверждает.

    Подтверждением считается свежая точка рядом с остановкой, а для пассажира
    в салоне — рядом с линией маршрута.
    """
    if loc is None or now - loc.ts > LOCATION_MAX_AGE_S:
        return TRUST_NO_LOCATION, NO_LOCATION
    if haversine(loc.lat, loc.lon, stop.lat, stop.lon) <= LOCATION_MAX_DIST_M:
        return TRUST_OK, None
    if in_ride and direction.line.project(loc.lat, loc.lon).offset <= LOCATION_MAX_DIST_M:
        return TRUST_OK, None
    return TRUST_NO_LOCATION, FAR_FROM_STOP


def check_speed(prev: Point | None, cur: Point) -> str | None:
    """Две отметки подряд не могут быть дальше друг от друга, чем позволяет транспорт."""
    if prev is None:
        return None
    dt = cur.ts - prev.ts
    dist = haversine(prev.lat, prev.lon, cur.lat, cur.lon)
    if dt <= 0:
        return TOO_FAST if dist > LOCATION_MAX_DIST_M else None
    return TOO_FAST if dist / dt * 3.6 > MAX_SPEED_KMH else None
