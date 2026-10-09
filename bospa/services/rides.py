"""Источник А: live-локации пассажиров «🚌 Я в автобусе»."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.domain.antifraud import Point
from bospa.domain.fusion import OFFICIAL_PREFIX
from bospa.domain.mapmatch import TrackState, match
from bospa.domain.routes import Network
from bospa.infra.redis_repo import RedisRepo
from bospa.services.points import RIDE_AWARD_PERIOD_S, RIDE_POINTS, award, get_or_create_user


@dataclass
class RideUpdate:
    track: TrackState
    awarded: int = 0
    balance: int | None = None


class RideService:
    def __init__(self, network: Network, repo: RedisRepo, sessionmaker: async_sessionmaker):
        self.network = network
        self.repo = repo
        self.sessionmaker = sessionmaker

    async def select(self, uid: int, route: str, dir_id: str) -> None:
        await self.repo.stop_ride(uid)
        await self.repo.set_ride_selection(uid, route, dir_id)

    async def stop(self, uid: int) -> None:
        await self.repo.stop_ride(uid)

    async def on_live_location(self, uid: int, lat: float, lon: float, now: float, started: bool) -> RideUpdate | None:
        """Очередная точка трансляции. None — пассажир не выбрал маршрут."""
        sel = await self.repo.get_ride_selection(uid)
        if sel is None:
            return None
        route, dir_id = sel
        direction = self.network.direction(route, dir_id)
        if direction is None:
            return None

        await self.repo.set_location(uid, Point(lat, lon, now))
        prev = None if started else await self.repo.get_crowd_track(route, dir_id, uid)
        track = match(direction, lat, lon, now, prev)
        await self.repo.set_crowd_track(route, dir_id, uid, track)

        if started:
            await self.repo.set_ride_award_ts(uid, now)
            return RideUpdate(track)
        return await self._maybe_award(uid, route, dir_id, track, now)

    async def _maybe_award(self, uid, route, dir_id, track: TrackState, now: float) -> RideUpdate:
        """+5 B за каждые 5 минут поездки, если трек похож на настоящий автобус."""
        last = await self.repo.get_ride_award_ts(uid)
        if not track.valid or last is None or now - last < RIDE_AWARD_PERIOD_S:
            return RideUpdate(track)
        if await self.repo.is_official_available(route, dir_id):
            ride = await self.repo.get_ride(uid)
            if not ride or not (ride.vehicle_id or "").startswith(OFFICIAL_PREFIX):
                return RideUpdate(track)
        await self.repo.set_ride_award_ts(uid, now)
        async with self.sessionmaker() as session, session.begin():
            user, _ = await get_or_create_user(session, uid)
            if user.is_banned:
                return RideUpdate(track)
            balance = await award(session, user, RIDE_POINTS, "ride")
        return RideUpdate(track, RIDE_POINTS, balance)
