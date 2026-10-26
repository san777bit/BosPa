import time
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.api.auth import verify_init_data
from bospa.config import Settings
from bospa.domain.antifraud import Point
from bospa.domain.routes import Direction, Network
from bospa.domain.status import LEVELS, compute_status
from bospa.infra.models import User
from bospa.infra.redis_repo import RedisRepo
from bospa.services.checkins import CheckinService
from bospa.services.devices import DeviceService
from bospa.services.rides import RideService
from bospa.services.status import StatusService

WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class CheckinIn(BaseModel):
    route: str
    dir: str
    stop_id: str
    level: int = Field(ge=min(LEVELS), le=max(LEVELS))


class RideIn(BaseModel):
    route: str
    dir: str


def create_app(settings: Settings, network: Network, repo: RedisRepo, sessionmaker: async_sessionmaker) -> FastAPI:
    app = FastAPI(title="BosPa API", docs_url=None, redoc_url=None)
    if settings.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                           allow_methods=["GET", "POST", "DELETE"],
                           allow_headers=["Authorization", "Content-Type", "X-Telegram-Init-Data"])
    statuses = StatusService(network, repo)
    checkins = CheckinService(network, repo, sessionmaker)
    rides = RideService(network, repo, sessionmaker)
    devices = DeviceService(sessionmaker)

    async def current_uid(authorization: str = Header(default=""),
                          x_telegram_init_data: str = Header(default="")) -> int | None:
        """id пользователя: токен устройства (приложение) или initData (Mini App). None — данных нет."""
        if authorization:
            scheme, _, token = authorization.partition(" ")
            uid = await devices.resolve(token) if scheme.lower() == "bearer" and token else None
            if uid is None:
                raise HTTPException(401, "invalid device token")
            return uid
        if x_telegram_init_data and settings.bot_token:
            user = verify_init_data(x_telegram_init_data, settings.bot_token, time.time())
            if user is None or "id" not in user:
                raise HTTPException(401, "invalid Telegram initData")
            return int(user["id"])
        return None

    def auth(uid: int | None = Depends(current_uid)) -> None:
        """Чтение: любой пользователь, а с API_DEV_NO_AUTH — и без авторизации."""
        if uid is None and not settings.api_dev_no_auth:
            raise HTTPException(401, "authorization required")

    def user_id(uid: int | None = Depends(current_uid)) -> int:
        """Запись: нужен конкретный пользователь даже с API_DEV_NO_AUTH."""
        if uid is None:
            raise HTTPException(401, "authorization required")
        return uid

    def get_direction(route: str = Query(), dir: str = Query()) -> Direction:
        d = network.direction(route, dir)
        if d is None:
            raise HTTPException(404, "unknown route or direction")
        return d

    @app.get("/api/config")
    async def config():
        return {"map_style_url": settings.map_style_url}

    @app.get("/api/routes", dependencies=[Depends(auth)])
    async def routes():
        return [
            {
                "id": r.id, "title": r.title, "short": r.short, "kind": r.kind, "verified": r.verified,
                "directions": [
                    {
                        "id": d.id, "title": d.title,
                        # GeoJSON — [lon, lat]
                        "line": [[lon, lat] for lat, lon in d.line.points],
                        "stops": [{"id": s.id, "name": s.name, "lat": s.lat, "lon": s.lon, "s": round(s.s)}
                                  for s in d.stops],
                    }
                    for d in r.directions.values()
                ],
            }
            for r in network.routes.values()
        ]

    @app.get("/api/vehicles", dependencies=[Depends(auth)])
    async def vehicles(direction: Direction = Depends(get_direction)):
        now = time.time()
        items = await repo.get_vehicles(direction.route_id, direction.id)
        loads = await repo.get_vehicle_checkins([v["id"] for v in items], now)
        for v in items:
            st = compute_status(loads.get(v["id"], []), now, spatial=False)
            v["level"], v["level_count"] = st.level, st.count
        return items

    @app.get("/api/stops/status", dependencies=[Depends(auth)])
    async def stops_status(direction: Direction = Depends(get_direction)):
        views = await statuses.direction_views(direction, time.time())
        return [
            {
                "stop_id": v.stop.id,
                "level": v.status.level,
                "confidence": v.status.confidence,
                "count": v.status.count,
                "by_vehicle": v.by_vehicle,
                "vehicle_id": v.vehicle["id"] if v.vehicle else None,
                "eta_s": round(v.eta_s) if v.eta_s is not None else None,
            }
            for v in views
        ]

    # --- мобильное приложение ---------------------------------------------------

    @app.post("/api/devices", status_code=201)
    async def register_device():
        """Первый запуск приложения. Токен передаётся дальше как `Authorization: Bearer <token>`."""
        uid, token = await devices.register()
        return {"user_id": uid, "token": token}

    @app.get("/api/me")
    async def me(uid: int = Depends(user_id)):
        async with sessionmaker() as session:
            user = await session.get(User, uid)
        return {"user_id": uid, "balance": user.balance if user else 0}

    @app.post("/api/location", status_code=204)
    async def location(body: LocationIn, uid: int = Depends(user_id)):
        """Разовая геопозиция перед отметкой: без неё отметка засчитывается, но без баллов."""
        await repo.set_location(uid, Point(body.lat, body.lon, time.time()))
        return Response(status_code=204)

    @app.post("/api/checkins")
    async def checkin(body: CheckinIn, uid: int = Depends(user_id)):
        try:
            res = await checkins.report(uid, body.route, body.dir, body.stop_id, body.level, time.time())
        except ValueError:
            raise HTTPException(404, "unknown route, direction or stop")
        # accepted = False — повторная отметка этой остановки раньше кулдауна
        return {"accepted": res.accepted, "rewarded": res.rewarded, "points": res.points,
                "balance": res.balance, "reasons": res.reasons, "vehicle_id": res.vehicle_id}

    @app.post("/api/ride", status_code=204)
    async def ride_start(body: RideIn, uid: int = Depends(user_id)):
        """«Я в автобусе»: выбор маршрута. Дальше — точки в /api/ride/location."""
        if network.direction(body.route, body.dir) is None:
            raise HTTPException(404, "unknown route or direction")
        await rides.select(uid, body.route, body.dir)
        return Response(status_code=204)

    @app.delete("/api/ride", status_code=204)
    async def ride_stop(uid: int = Depends(user_id)):
        await rides.stop(uid)
        return Response(status_code=204)

    @app.post("/api/ride/location")
    async def ride_location(body: LocationIn, uid: int = Depends(user_id)):
        # Первая точка после выбора маршрута начинает трек (как начало трансляции в Telegram):
        # select() стирает время последнего начисления, а первая точка его ставит.
        started = await repo.get_ride_award_ts(uid) is None
        upd = await rides.on_live_location(uid, body.lat, body.lon, time.time(), started)
        if upd is None:
            raise HTTPException(409, "ride not started")
        ride = await repo.get_ride(uid)
        return {"valid": upd.track.valid, "s": round(upd.track.s), "speed_kmh": round(upd.track.speed_kmh, 1),
                "vehicle_id": ride.vehicle_id if ride else None,
                "awarded": upd.awarded, "balance": upd.balance}

    app.mount("/app", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")
    return app
