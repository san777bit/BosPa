"""Геометрия: расстояния и проекция точки на линию маршрута.

Внутри города достаточно локальной равнопромежуточной проекции: на масштабе
Алматы (~30 км) ошибка меньше метра на сотню метров, а считать её дёшево.
"""

import math
from bisect import bisect_right
from dataclasses import dataclass

EARTH_R = 6_371_000.0


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


@dataclass(frozen=True)
class Projection:
    s: float        # расстояние вдоль линии от её начала, м
    offset: float   # расстояние от точки до линии, м
    segment: int    # индекс отрезка линии


class Polyline:
    def __init__(self, points: list[tuple[float, float]]):
        if len(points) < 2:
            raise ValueError("polyline needs at least 2 points")
        self.points = points
        lat0 = sum(p[0] for p in points) / len(points)
        self._ky = math.pi / 180 * EARTH_R
        self._kx = self._ky * math.cos(math.radians(lat0))
        self._xy = [self._to_xy(lat, lon) for lat, lon in points]
        self._cum = [0.0]
        for (x1, y1), (x2, y2) in zip(self._xy, self._xy[1:]):
            self._cum.append(self._cum[-1] + math.hypot(x2 - x1, y2 - y1))
        self.length = self._cum[-1]

    def _to_xy(self, lat: float, lon: float) -> tuple[float, float]:
        return lon * self._kx, lat * self._ky

    def project(
        self, lat: float, lon: float, near_s: float | None = None, window: float = 1500.0
    ) -> Projection:
        """Ближайшая точка линии.

        Если задан near_s, ищем только в окне вокруг него: так точка не
        «перепрыгивает» на другой участок, когда маршрут проходит рядом сам с собой.
        """
        px, py = self._to_xy(lat, lon)
        lo, hi = 0, len(self._xy) - 1
        if near_s is not None:
            lo = max(0, bisect_right(self._cum, near_s - window) - 1)
            hi = min(len(self._xy) - 1, bisect_right(self._cum, near_s + window))
        best = Projection(0.0, math.inf, 0)
        for i in range(lo, hi):
            (x1, y1), (x2, y2) = self._xy[i], self._xy[i + 1]
            dx, dy = x2 - x1, y2 - y1
            seg2 = dx * dx + dy * dy
            t = 0.0 if seg2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / seg2))
            cx, cy = x1 + t * dx, y1 + t * dy
            d = math.hypot(px - cx, py - cy)
            if d < best.offset:
                best = Projection(self._cum[i] + t * math.sqrt(seg2), d, i)
        return best

    def _locate(self, s: float) -> tuple[int, float]:
        s = max(0.0, min(self.length, s))
        i = min(bisect_right(self._cum, s) - 1, len(self._xy) - 2)
        seg = self._cum[i + 1] - self._cum[i]
        t = 0.0 if seg == 0 else (s - self._cum[i]) / seg
        return i, t

    def point_at(self, s: float) -> tuple[float, float]:
        i, t = self._locate(s)
        (lat1, lon1), (lat2, lon2) = self.points[i], self.points[i + 1]
        return lat1 + t * (lat2 - lat1), lon1 + t * (lon2 - lon1)

    def bearing_at(self, s: float) -> float:
        """Направление движения в точке s, градусы от севера по часовой."""
        i, _ = self._locate(s)
        (x1, y1), (x2, y2) = self._xy[i], self._xy[i + 1]
        return (math.degrees(math.atan2(x2 - x1, y2 - y1)) + 360) % 360
