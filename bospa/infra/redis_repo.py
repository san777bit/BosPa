"""Все ключи Redis в одном месте. Схема — bospa-live-map.md, раздел 6, и tech-design, раздел 4."""

import json
from dataclasses import asdict

from redis.asyncio import Redis

from bospa.domain.antifraud import Point
from bospa.domain.fusion import RideState, Vehicle
from bospa.domain.mapmatch import TrackState
from bospa.domain.status import WINDOW_S, Checkin

CHECKIN_TTL_S = 20 * 60
COOLDOWN_S = 10 * 60
LOCATION_TTL_S = 5 * 60
CROWD_TTL_S = 2 * 60
OFFICIAL_TTL_S = 3 * 60
RIDE_TTL_S = 2 * 60
RIDE_SELECTION_TTL_S = 8 * 3600


class RedisRepo:
    def __init__(self, redis: Redis):
        self.r = redis

    # --- чекины по остановкам -------------------------------------------------

    async def add_checkin(self, route: str, dir_id: str, stop_id: str, c: Checkin) -> None:
        key = f"ck:{route}:{dir_id}:{stop_id}"
        member = f"{c.user_id}:{c.level}:{c.trust}:{c.ts}"
        async with self.r.pipeline() as p:
            p.zadd(key, {member: c.ts})
            p.expire(key, CHECKIN_TTL_S)
            await p.execute()

    async def get_checkins(self, route: str, dir_id: str, stops: list[tuple[str, int]],
                           now: float) -> dict[str, list[Checkin]]:
        """stops — пары (stop_id, stop_idx). Возвращает живые отметки по каждой остановке."""
        async with self.r.pipeline() as p:
            for stop_id, _ in stops:
                key = f"ck:{route}:{dir_id}:{stop_id}"
                p.zremrangebyscore(key, "-inf", now - CHECKIN_TTL_S)
                p.zrangebyscore(key, now - WINDOW_S, "+inf")
            res = await p.execute()
        out = {}
        for i, (stop_id, idx) in enumerate(stops):
            out[stop_id] = [_parse_checkin(m, idx) for m in res[2 * i + 1]]
        return out

    async def add_vehicle_checkin(self, vehicle_id: str, c: Checkin) -> None:
        key = f"vload:{vehicle_id}"
        async with self.r.pipeline() as p:
            p.zadd(key, {f"{c.user_id}:{c.level}:{c.trust}:{c.ts}": c.ts})
            p.expire(key, CHECKIN_TTL_S)
            await p.execute()

    async def get_vehicle_checkins(self, vehicle_ids: list[str], now: float) -> dict[str, list[Checkin]]:
        if not vehicle_ids:
            return {}
        async with self.r.pipeline() as p:
            for vid in vehicle_ids:
                p.zrangebyscore(f"vload:{vid}", now - WINDOW_S, "+inf")
            res = await p.execute()
        return {vid: [_parse_checkin(m, 0) for m in members] for vid, members in zip(vehicle_ids, res)}

    async def try_cooldown(self, uid: int, route: str, stop_id: str) -> bool:
        """True, если пользователь ещё не отмечался на этой остановке в последние 10 минут."""
        return bool(await self.r.set(f"cd:{uid}:{route}:{stop_id}", 1, nx=True, ex=COOLDOWN_S))

    async def incr_hourly(self, uid: int, now: float) -> int:
        key = f"rl:{uid}:{int(now // 3600)}"
        async with self.r.pipeline() as p:
            p.incr(key)
            p.expire(key, 3600)
            count, _ = await p.execute()
        return int(count)

    # --- геолокация и предпочтения ----------------------------------------------

    async def set_location(self, uid: int, pt: Point) -> None:
        await self.r.set(f"loc:{uid}", json.dumps(asdict(pt)), ex=LOCATION_TTL_S)

    async def get_location(self, uid: int) -> Point | None:
        return _load(Point, await self.r.get(f"loc:{uid}"))

    async def set_last_checkin(self, uid: int, pt: Point) -> None:
        await self.r.set(f"lastck:{uid}", json.dumps(asdict(pt)), ex=3600)

    async def get_last_checkin(self, uid: int) -> Point | None:
        return _load(Point, await self.r.get(f"lastck:{uid}"))

    async def set_pref(self, uid: int, route: str, dir_id: str) -> None:
        await self.r.hset(f"pref:{uid}", mapping={"route": route, "dir": dir_id})

    async def get_pref(self, uid: int) -> tuple[str, str] | None:
        h = await self.r.hgetall(f"pref:{uid}")
        return (_s(h[b"route"]), _s(h[b"dir"])) if h else None

    # --- поездки пассажиров (источник А) -----------------------------------------

    async def set_ride_selection(self, uid: int, route: str, dir_id: str) -> None:
        await self.r.set(f"ridesel:{uid}", f"{route}:{dir_id}", ex=RIDE_SELECTION_TTL_S)

    async def get_ride_selection(self, uid: int) -> tuple[str, str] | None:
        v = await self.r.get(f"ridesel:{uid}")
        if not v:
            return None
        route, dir_id = _s(v).split(":", 1)
        return route, dir_id

    async def stop_ride(self, uid: int) -> None:
        sel = await self.get_ride_selection(uid)
        async with self.r.pipeline() as p:
            p.delete(f"ridesel:{uid}", f"ride:{uid}", f"rideaward:{uid}")
            if sel:
                p.hdel(f"obs:crowd:{sel[0]}:{sel[1]}", str(uid))
            await p.execute()

    async def set_crowd_track(self, route: str, dir_id: str, uid: int, t: TrackState) -> None:
        key = f"obs:crowd:{route}:{dir_id}"
        async with self.r.pipeline() as p:
            p.hset(key, str(uid), json.dumps(asdict(t)))
            p.expire(key, CROWD_TTL_S)
            await p.execute()

    async def get_crowd_track(self, route: str, dir_id: str, uid: int) -> TrackState | None:
        return _load(TrackState, await self.r.hget(f"obs:crowd:{route}:{dir_id}", str(uid)))

    async def get_crowd_tracks(self, route: str, dir_id: str, now: float) -> dict[int, TrackState]:
        key = f"obs:crowd:{route}:{dir_id}"
        out, stale = {}, []
        for uid, raw in (await self.r.hgetall(key)).items():
            t = _load(TrackState, raw)
            if now - t.ts > CROWD_TTL_S:
                stale.append(uid)
            else:
                out[int(uid)] = t
        if stale:
            await self.r.hdel(key, *stale)
        return out

    async def set_official_tracks(self, route: str, dir_id: str, tracks: dict[str, TrackState]) -> None:
        key = f"obs:official:{route}:{dir_id}"
        async with self.r.pipeline() as p:
            p.delete(key)
            if tracks:
                p.hset(key, mapping={k: json.dumps(asdict(t)) for k, t in tracks.items()})
                p.expire(key, OFFICIAL_TTL_S)
            await p.execute()

    async def get_rides(self, uids: list[int]) -> dict[int, RideState]:
        if not uids:
            return {}
        vals = await self.r.mget([f"ride:{u}" for u in uids])
        return {u: _load(RideState, v) for u, v in zip(uids, vals) if v}

    async def get_ride(self, uid: int) -> RideState | None:
        return _load(RideState, await self.r.get(f"ride:{uid}"))

    async def set_rides(self, rides: dict[int, RideState]) -> None:
        if not rides:
            return
        async with self.r.pipeline() as p:
            for uid, r in rides.items():
                p.set(f"ride:{uid}", json.dumps(asdict(r)), ex=RIDE_TTL_S)
            await p.execute()

    async def get_ride_award_ts(self, uid: int) -> float | None:
        v = await self.r.get(f"rideaward:{uid}")
        return float(v) if v else None

    async def set_ride_award_ts(self, uid: int, ts: float) -> None:
        await self.r.set(f"rideaward:{uid}", ts, ex=RIDE_SELECTION_TTL_S)

    # --- итоговые борта ---------------------------------------------------------

    async def set_vehicles(self, route: str, dir_id: str, vehicles: list[dict]) -> None:
        key = f"veh:{route}:{dir_id}"
        async with self.r.pipeline() as p:
            p.delete(key)
            if vehicles:
                p.hset(key, mapping={v["id"]: json.dumps(v) for v in vehicles})
                p.expire(key, 60)
            await p.execute()

    async def get_vehicles(self, route: str, dir_id: str) -> list[dict]:
        return [json.loads(v) for v in (await self.r.hgetall(f"veh:{route}:{dir_id}")).values()]

    async def set_official_available(self, route: str, dir_id: str, available: bool) -> None:
        key = f"offavail:{route}:{dir_id}"
        if available:
            await self.r.set(key, 1, ex=int(OFFICIAL_TTL_S))
        else:
            await self.r.delete(key)

    async def is_official_available(self, route: str, dir_id: str) -> bool:
        return bool(await self.r.exists(f"offavail:{route}:{dir_id}"))

    # --- скорости по отрезкам -----------------------------------------------------

    async def get_segment_speeds(self, route: str, dir_id: str, bucket: str) -> dict[int, float]:
        raw = await self.r.hgetall(f"segspeed:{route}:{dir_id}")
        out = {}
        for k, v in raw.items():
            seg, b = _s(k).split("|", 1)
            if b == bucket:
                out[int(seg)] = float(v)
        return out

    async def set_segment_speed(self, route: str, dir_id: str, seg: int, bucket: str, speed: float) -> None:
        await self.r.hset(f"segspeed:{route}:{dir_id}", f"{seg}|{bucket}", round(speed, 2))

    async def get_segment_speed(self, route: str, dir_id: str, seg: int, bucket: str) -> float | None:
        v = await self.r.hget(f"segspeed:{route}:{dir_id}", f"{seg}|{bucket}")
        return float(v) if v else None


def _s(v: bytes | str) -> str:
    return v.decode() if isinstance(v, bytes) else v


def _load(cls, raw):
    return cls(**json.loads(raw)) if raw else None


def _parse_checkin(member: bytes | str, stop_idx: int) -> Checkin:
    uid, level, trust, ts = _s(member).split(":")
    return Checkin(int(uid), int(level), float(trust), float(ts), stop_idx)

