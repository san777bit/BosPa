"""Локальная демонстрация карты без Telegram и Redis.

    uv run python scripts/demo_map.py   →   http://localhost:8080/app/

По каждому направлению «едут» смоделированные пассажиры (источник А), цикл
слияния строит из них борта, на нескольких остановках есть случайные отметки.
"""

import asyncio
import random
import sys
import time
from pathlib import Path

import uvicorn
from fakeredis import FakeAsyncRedis

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from bospa.api.app import create_app  # noqa: E402
from bospa.config import Settings  # noqa: E402
from bospa.domain.routes import Network  # noqa: E402
from bospa.domain.status import Checkin  # noqa: E402
from bospa.infra.db import create_schema, make_engine, make_sessionmaker  # noqa: E402
from bospa.infra.redis_repo import RedisRepo  # noqa: E402
from bospa.services.fusion_loop import FusionRunner  # noqa: E402
from bospa.services.rides import RideService  # noqa: E402
from bospa.sources.official import NullSource  # noqa: E402

SPEED_MPS = 8.0      # ~29 км/ч
TICK_S = 2.0


async def simulate(network: Network, repo: RedisRepo, rides: RideService) -> None:
    riders = []
    uid = 1
    for d in network.directions():
        for start in (0.15, 0.55):
            await rides.select(uid, d.route_id, d.id)
            riders.append((uid, d, start * d.line.length))
            uid += 1
    started = set()
    t0 = time.time()
    while True:
        now = time.time()
        for uid, d, s0 in riders:
            s = (s0 + SPEED_MPS * (now - t0)) % d.line.length
            lat, lon = d.line.point_at(s)
            await rides.on_live_location(uid, lat, lon, now, started=uid not in started)
            started.add(uid)
        await asyncio.sleep(TICK_S)


async def seed_checkins(network: Network, repo: RedisRepo) -> None:
    rnd = random.Random(7)
    now = time.time()
    for d in network.directions():
        for stop in rnd.sample(d.stops, k=min(4, len(d.stops))):
            for i in range(rnd.randint(1, 4)):
                await repo.add_checkin(d.route_id, d.id, stop.id,
                                       Checkin(1000 + i, rnd.choice((0, 1, 2)), 1.0, now - rnd.randint(0, 600)))


async def main() -> None:
    # CORS — для веб-версии мобильного приложения (npx expo start --web, порт 8081)
    settings = Settings(bot_token="0:demo", api_dev_no_auth=True, cors_origins=["http://localhost:8081"])
    network = Network.load(settings.routes_file)
    repo = RedisRepo(FakeAsyncRedis())
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    await create_schema(engine)
    sessionmaker = make_sessionmaker(engine)
    rides = RideService(network, repo, sessionmaker)
    fusion = FusionRunner(network, repo, NullSource())
    await seed_checkins(network, repo)

    server = uvicorn.Server(uvicorn.Config(create_app(settings, network, repo, sessionmaker),
                                           host="127.0.0.1", port=settings.api_port))
    print(f"карта: http://localhost:{settings.api_port}/app/")
    await asyncio.gather(server.serve(), simulate(network, repo, rides), fusion.run(TICK_S))


if __name__ == "__main__":
    asyncio.run(main())
