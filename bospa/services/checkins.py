"""Чекин: кулдаун → антифрод → запись в Redis и архив → баллы."""

from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.domain import antifraud as af
from bospa.domain.antifraud import Point
from bospa.domain.fusion import OFFICIAL_PREFIX
from bospa.domain.routes import Network
from bospa.domain.status import TRUST_NONE, Checkin
from bospa.infra.models import CheckinRow, User
from bospa.infra.redis_repo import RedisRepo
from bospa.services.points import CHECKIN_POINTS, REFERRAL_POINTS, award, get_or_create_user

# Борт в пределах этого расстояния от остановки считается тем, о котором отметка.
STOP_VEHICLE_RADIUS_M = 80.0


@dataclass
class CheckinResult:
    accepted: bool                  # False — сработал кулдаун, отметка не записана
    rewarded: bool = False
    points: int = 0
    balance: int = 0
    reasons: list[str] = field(default_factory=list)
    vehicle_id: str | None = None


class CheckinService:
    def __init__(self, network: Network, repo: RedisRepo, sessionmaker: async_sessionmaker):
        self.network = network
        self.repo = repo
        self.sessionmaker = sessionmaker

    async def report(self, uid: int, route: str, dir_id: str, stop_id: str, level: int, now: float) -> CheckinResult:
        direction = self.network.direction(route, dir_id)
        stop = direction.stop(stop_id) if direction else None
        if stop is None:
            raise ValueError(f"unknown stop {route}/{dir_id}/{stop_id}")

        if not await self.repo.try_cooldown(uid, route, stop_id):
            return CheckinResult(accepted=False)

        loc = await self.repo.get_location(uid)
        ride_sel = await self.repo.get_ride_selection(uid)
        in_ride = ride_sel == (route, dir_id)
        ride = await self.repo.get_ride(uid) if in_ride else None

        reasons = []
        trust, reason = af.check_location(loc, now, direction, stop, in_ride)
        if reason:
            reasons.append(reason)
        if loc and not reason:
            if r := af.check_speed(await self.repo.get_last_checkin(uid), Point(loc.lat, loc.lon, now)):
                reasons.append(r)

        vehicle_id = await self._vehicle_for(direction, stop.s, ride, in_ride, trust_ok=not reason)
        if in_ride and await self.repo.is_official_available(route, dir_id) \
                and not (vehicle_id or "").startswith(OFFICIAL_PREFIX):
            # Человек «в автобусе», а официального борта рядом нет
            reasons.append(af.NO_OFFICIAL_VEHICLE)

        async with self.sessionmaker() as session, session.begin():
            user, _ = await get_or_create_user(session, uid)
            if user.is_banned:
                trust = TRUST_NONE
                reasons.append(af.BANNED)

            checkin = Checkin(uid, level, trust, now, stop.idx)
            await self.repo.add_checkin(route, dir_id, stop_id, checkin)
            if vehicle_id:
                await self.repo.add_vehicle_checkin(vehicle_id, checkin)

            if not reasons and await self.repo.incr_hourly(uid, now) > af.HOURLY_REWARD_LIMIT:
                reasons.append(af.HOURLY_LIMIT)
            rewarded = not reasons

            row = CheckinRow(user_id=uid, route=route, dir=dir_id, stop_id=stop_id, vehicle_id=vehicle_id,
                             level=level, lat=loc.lat if loc else None, lon=loc.lon if loc else None,
                             trust=trust, rewarded=rewarded, reject_reason=",".join(reasons) or None)
            session.add(row)
            await session.flush()

            if rewarded:
                await award(session, user, CHECKIN_POINTS, "checkin", row.id)
                await self._referral_bonus(session, user)
            balance = user.balance

        if loc and not reasons:
            await self.repo.set_last_checkin(uid, Point(loc.lat, loc.lon, now))
        return CheckinResult(True, rewarded, CHECKIN_POINTS if rewarded else 0, balance, reasons, vehicle_id)

    async def _vehicle_for(self, direction, stop_s, ride, in_ride, trust_ok) -> str | None:
        if in_ride:
            return ride.vehicle_id if ride else None
        if not trust_ok:
            return None
        near = [v for v in await self.repo.get_vehicles(direction.route_id, direction.id)
                if direction.gap(v["s"], stop_s) <= STOP_VEHICLE_RADIUS_M and not v["stale"]]
        return min(near, key=lambda v: direction.gap(v["s"], stop_s))["id"] if near else None

    async def _referral_bonus(self, session, user: User) -> None:
        """+50 B пригласившему — после первого валидного чекина приглашённого."""
        if not user.referrer_id or user.referral_rewarded:
            return
        referrer = await session.get(User, user.referrer_id)
        if referrer and not referrer.is_banned:
            await award(session, referrer, REFERRAL_POINTS, "referral", user.tg_id)
        user.referral_rewarded = True
