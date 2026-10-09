"""Статические данные маршрутов: линии и остановки из data/routes.yaml."""

import logging
from bisect import bisect_right
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from bospa.domain.geo import Polyline, haversine

log = logging.getLogger(__name__)

# Остановка дальше этого расстояния от линии — скорее всего ошибка в данных.
MAX_STOP_OFFSET_M = 80.0
# Следующую остановку ищем на линии не дальше этого расстояния от предыдущей
STOP_SEARCH_AHEAD_M = 8000.0


@dataclass(frozen=True)
class Stop:
    id: str
    name: str
    lat: float
    lon: float
    idx: int    # порядковый номер в направлении
    s: float    # положение вдоль линии, м
    approx: bool = False    # места нет в открытых данных, стоит приблизительно


@dataclass
class Direction:
    route_id: str
    id: str
    title: str
    line: Polyline
    stops: list[Stop]
    ring: bool = False      # кольцевой: линия начинается и заканчивается на одной конечной
    _by_id: dict[str, Stop] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._by_id = {s.id: s for s in self.stops}
        self._stop_s = [s.s for s in self.stops]

    def stop(self, stop_id: str) -> Stop | None:
        return self._by_id.get(stop_id)

    def segment_index(self, s: float) -> int:
        """Номер отрезка между остановками: i — от stops[i] до stops[i+1]; -1 — до первой."""
        return bisect_right(self._stop_s, s) - 1

    def gap(self, a: float, b: float) -> float:
        """Расстояние вдоль линии между двумя точками; на кольце — через конечную, если так короче."""
        d = abs(a - b)
        return min(d, self.line.length - d) if self.ring else d

    def nearest_stop(self, lat: float, lon: float) -> tuple[float, Stop]:
        return min(((haversine(lat, lon, s.lat, s.lon), s) for s in self.stops), key=lambda x: x[0])


@dataclass
class Route:
    id: str
    title: str
    short: str
    kind: str
    verified: bool
    directions: dict[str, Direction]


class Network:
    def __init__(self, routes: list[Route]):
        self.routes = {r.id: r for r in routes}

    @classmethod
    def load(cls, path: Path) -> "Network":
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        return cls([_parse_route(r) for r in raw["routes"]])

    def direction(self, route_id: str, dir_id: str) -> Direction | None:
        route = self.routes.get(route_id)
        return route.directions.get(dir_id) if route else None

    def directions(self):
        for route in self.routes.values():
            yield from route.directions.values()

    def nearby(self, lat: float, lon: float, radius_m: float) -> list[tuple[float, Direction, Stop]]:
        """Ближайшая остановка каждого направления в радиусе, по возрастанию расстояния."""
        found = []
        for d in self.directions():
            dist, stop = d.nearest_stop(lat, lon)
            if dist <= radius_m:
                found.append((dist, d, stop))
        return sorted(found, key=lambda x: x[0])


def _parse_route(r: dict) -> Route:
    directions = {}
    for d in r["directions"]:
        line = Polyline([(p[0], p[1]) for p in d["line"]])
        # Остановки идут в порядке следования; каждую ищем на линии после предыдущей,
        # иначе на маршруте, который дважды проходит по одной улице, порядок спутается.
        stops, prev_s = [], 0.0
        half = STOP_SEARCH_AHEAD_M / 2
        for i, st in enumerate(d["stops"]):
            p = line.project(st["lat"], st["lon"], near_s=prev_s + half, window=half)
            if p.offset > MAX_STOP_OFFSET_M:
                p = line.project(st["lat"], st["lon"])
                log.warning("route %s/%s: stop %s is %.0f m off the line", r["id"], d["id"], st["id"], p.offset)
            if p.s < prev_s:
                log.warning("route %s/%s: stop %s is out of order", r["id"], d["id"], st["id"])
            prev_s = p.s
            stops.append(Stop(st["id"], st["name"], st["lat"], st["lon"], i, p.s, st.get("approx", False)))
        directions[d["id"]] = Direction(r["id"], d["id"], d["title"], line, stops, d.get("ring", False))
    return Route(r["id"], r["title"], r.get("short", r["id"]), r.get("kind", "bus"),
                 r.get("verified", False), directions)
