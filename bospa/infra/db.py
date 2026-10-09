from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from bospa.infra.models import Base


def make_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, pool_pre_ping=True)


def make_sessionmaker(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)


async def create_schema(engine: AsyncEngine) -> None:
    # Для MVP схема создаётся при старте; когда она стабилизируется — перейти на Alembic.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
