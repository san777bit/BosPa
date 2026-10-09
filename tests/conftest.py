import pytest
import pytest_asyncio
from fakeredis import FakeAsyncRedis

from bospa.domain.geo import Polyline
from bospa.domain.routes import Direction, Network, Route, Stop
from bospa.infra.db import create_schema, make_engine, make_sessionmaker
from bospa.infra.redis_repo import RedisRepo

LAT0, LON0 = 43.20, 76.90
M_PER_DEG_LAT = 111_195.0
LINE_M = 5000.0
STOP_EVERY_M = 500.0


def at(s: float, east_m: float = 0.0) -> tuple[float, float]:
    """Точка на тестовой линии: s метров на север от начала, east_m — смещение вбок."""
    import math
    return LAT0 + s / M_PER_DEG_LAT, LON0 + east_m / (M_PER_DEG_LAT * math.cos(math.radians(LAT0)))


def make_direction(route_id: str = "r1", dir_id: str = "a") -> Direction:
    line = Polyline([at(0), at(LINE_M / 2), at(LINE_M)])
    stops = []
    for i in range(int(LINE_M // STOP_EVERY_M) + 1):
        lat, lon = at(i * STOP_EVERY_M)
        stops.append(Stop(f"st{i:02d}", f"Остановка {i}", lat, lon, i, i * STOP_EVERY_M))
    return Direction(route_id, dir_id, "→ Север", line, stops)


@pytest.fixture
def direction() -> Direction:
    return make_direction()


@pytest.fixture
def network(direction) -> Network:
    return Network([Route("r1", "Автобус №1", "1", "bus", True, {"a": direction})])


@pytest_asyncio.fixture
async def repo():
    redis = FakeAsyncRedis()
    yield RedisRepo(redis)
    await redis.aclose()


@pytest_asyncio.fixture
async def sessionmaker():
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    await create_schema(engine)
    yield make_sessionmaker(engine)
    await engine.dispose()
