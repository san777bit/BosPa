"""Фоновый цикл: раз в несколько секунд собирает оба источника в итоговые борта."""

import asyncio
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.domain.eta import ema, time_bucket
from bospa.domain.fusion import OFFICIAL_MAX_AGE_S, CrowdTrack, OfficialTrack, Vehicle, fuse
from bospa.domain.mapmatch import TrackState, match
from bospa.domain.routes import Direction, Network
from bospa.infra.models import TrackPoint
from bospa.infra.redis_repo import RedisRepo
from bospa.sources.official import VehicleSource

log = logging.getLogger(__name__)

TRACK_POINT_PERIOD_S = 15.0
MAX_LEARN_GAP_S = 120.0
MAX_LEARN_STEP_M = 1000.0


class FusionRunner:
    def __init__(self, network: Network, repo: RedisRepo, official: VehicleSource,
                 sessionmaker: async_sessionmaker | None = None):
        self.network = network
        self.repo = repo
        self.official = official
        self.sessionmaker = sessionmaker
        # Состояние в памяти процесса: треки официальных бортов и прошлые позиции для обучения скоростей
        self._off_tracks: dict[tuple[str, str], dict[str, TrackState]] = defaultdict(dict)
        self._prev: dict[str, Vehicle] = {}
        self._last_point: dict[str, float] = {}
        self._pending_points: list[TrackPoint] = []

    async def run(self, interval_s: float) -> None:
        while True:
            try:
                await self.tick(time.time())
            except Exception:
                log.exception("fusion tick failed")
            await asyncio.sleep(interval_s)

    async def tick(self, now: float) -> None:
        try:
            observations = await self.official.fetch()
        except Exception:
            log.exception("official source %s failed", self.official.name)
            observations = []
        by_dir = defaultdict(list)
        for o in observations:
            by_dir[(o.route, o.direction)].append(o)

        for direction in self.network.directions():
            key = (direction.route_id, direction.id)
            await self._tick_direction(direction, by_dir.get(key, []), now)
        await self._flush_points()
        self._forget_old(now)

    def _forget_old(self, now: float, max_age_s: float = 600.0) -> None:
        for vid in [vid for vid, v in self._prev.items() if now - v.ts > max_age_s]:
            del self._prev[vid]
            self._last_point.pop(vid, None)

    async def _tick_direction(self, direction: Direction, observations, now: float) -> None:
        route, dir_id = direction.route_id, direction.id

        tracks = self._off_tracks[(route, dir_id)]
        for o in observations:
            t = match(direction, o.lat, o.lon, o.ts, tracks.get(o.vehicle_ext_id))
            t.valid = True  # официальному борту доверяем, даже если он стоит на конечной
            tracks[o.vehicle_ext_id] = t
        for ext_id in [e for e, t in tracks.items() if now - t.ts > OFFICIAL_MAX_AGE_S]:
            del tracks[ext_id]
        official_available = bool(tracks)
        await self.repo.set_official_tracks(route, dir_id, tracks)
        await self.repo.set_official_available(route, dir_id, official_available)

        officials = [OfficialTrack(e, t.s, t.speed_kmh, t.ts) for e, t in tracks.items()]
        crowd_tracks = await self.repo.get_crowd_tracks(route, dir_id, now)
        crowd = [CrowdTrack(uid, t.s, t.speed_kmh, t.ts, t.valid) for uid, t in crowd_tracks.items()]
        rides = await self.repo.get_rides(list(crowd_tracks))

        vehicles, new_rides = fuse(now, direction.line.length, officials, crowd, rides, official_available)
        await self.repo.set_rides(new_rides)
        await self.repo.set_vehicles(route, dir_id, [self._serialize(direction, v, now) for v in vehicles])
        await self._learn_speeds(direction, vehicles, now)
        self._collect_points(direction, vehicles, now)

    @staticmethod
    def _serialize(direction: Direction, v: Vehicle, now: float) -> dict:
        lat, lon = direction.line.point_at(v.s)
        return {
            "id": v.id, "route": direction.route_id, "dir": direction.id,
            "s": round(v.s, 1), "lat": lat, "lon": lon,
            "bearing": round(direction.line.bearing_at(v.s)),
            "speed_kmh": round(v.speed_kmh, 1), "source": v.source,
            "age_s": round(now - v.ts), "stale": v.stale,
            "ext_id": v.ext_id, "riders": len(v.riders),
        }

    async def _learn_speeds(self, direction: Direction, vehicles: list[Vehicle], now: float) -> None:
        """Скорость по отрезкам: EMA по реальному продвижению бортов, включая стоянки."""
        bucket = time_bucket(now)
        for v in vehicles:
            prev = self._prev.get(v.id)
            self._prev[v.id] = v
            if v.stale or prev is None or prev.stale:
                continue
            dt, ds = v.ts - prev.ts, v.s - prev.s
            if not (0 < dt <= MAX_LEARN_GAP_S) or not (0 <= ds <= MAX_LEARN_STEP_M):
                continue
            seg = direction.segment_index(v.s)
            old = await self.repo.get_segment_speed(direction.route_id, direction.id, seg, bucket)
            await self.repo.set_segment_speed(direction.route_id, direction.id, seg, bucket,
                                              ema(old, ds / dt * 3.6))

    def _collect_points(self, direction: Direction, vehicles: list[Vehicle], now: float) -> None:
        if self.sessionmaker is None:
            return
        for v in vehicles:
            if v.stale or now - self._last_point.get(v.id, 0) < TRACK_POINT_PERIOD_S:
                continue
            self._last_point[v.id] = now
            lat, lon = direction.line.point_at(v.s)
            self._pending_points.append(TrackPoint(
                source=v.source, route=direction.route_id, dir=direction.id, vehicle_id=v.id,
                s=v.s, lat=lat, lon=lon, speed_kmh=v.speed_kmh,
                ts=datetime.fromtimestamp(v.ts, timezone.utc)))

    async def _flush_points(self) -> None:
        if not self._pending_points or self.sessionmaker is None:
            return
        points, self._pending_points = self._pending_points, []
        async with self.sessionmaker() as session, session.begin():
            session.add_all(points)
