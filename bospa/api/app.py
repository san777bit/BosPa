import time
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from bospa.api.auth import verify_init_data
from bospa.config import Settings
from bospa.domain.routes import Direction, Network
from bospa.domain.status import compute_status
from bospa.infra.redis_repo import RedisRepo
from bospa.services.status import StatusService

WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"


def create_app(settings: Settings, network: Network, repo: RedisRepo, statuses: StatusService) -> FastAPI:
    app = FastAPI(title="BosPa API", docs_url=None, redoc_url=None)

    def auth(x_telegram_init_data: str = Header(default="")) -> dict:
        if settings.api_dev_no_auth:
            return {}
        user = verify_init_data(x_telegram_init_data, settings.bot_token, time.time())
        if user is None:
            raise HTTPException(401, "invalid Telegram initData")
        return user

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

    app.mount("/app", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")
    return app
