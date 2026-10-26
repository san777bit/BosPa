"""Запуск: API (Mini App и мобильное приложение), цикл слияния и бот, если задан BOT_TOKEN, — в одном процессе."""

import asyncio
import logging

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import MenuButtonWebApp, WebAppInfo
from redis.asyncio import Redis

from bospa.api.app import create_app
from bospa.bot.handlers import flow, ride, start
from bospa.config import Settings
from bospa.domain.routes import Network
from bospa.infra.db import create_schema, make_engine, make_sessionmaker
from bospa.infra.redis_repo import RedisRepo
from bospa.services.checkins import CheckinService
from bospa.services.fusion_loop import FusionRunner
from bospa.services.rides import RideService
from bospa.services.status import StatusService
from bospa.sources.official import NullSource


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = Settings()

    network = Network.load(settings.routes_file)
    redis = Redis.from_url(settings.redis_url)
    repo = RedisRepo(redis)
    engine = make_engine(settings.database_url)
    await create_schema(engine)
    sessionmaker = make_sessionmaker(engine)

    fusion = FusionRunner(network, repo, NullSource(), sessionmaker)
    api = uvicorn.Server(uvicorn.Config(
        create_app(settings, network, repo, sessionmaker),
        host=settings.api_host, port=settings.api_port, log_level="info",
    ))
    tasks = [api.serve(), fusion.run(settings.fusion_interval_s)]

    bot = None
    if settings.bot_token:
        bot = Bot(settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        dp = Dispatcher(
            storage=RedisStorage(redis),
            settings=settings,
            network=network,
            repo=repo,
            sessionmaker=sessionmaker,
            statuses=StatusService(network, repo),
            checkins=CheckinService(network, repo, sessionmaker),
            rides=RideService(network, repo, sessionmaker),
        )
        dp.include_routers(start.router, ride.router, flow.router)
        if settings.webapp_url:
            # Кнопка «Карта» слева от поля ввода во всех чатах с ботом
            await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(
                text="Карта", web_app=WebAppInfo(url=settings.webapp_url)))
        tasks.append(dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types()))
    else:
        logging.info("BOT_TOKEN не задан: бот выключен, работают API и цикл слияния")

    try:
        await asyncio.gather(*tasks)
    finally:
        if bot:
            await bot.session.close()
        await redis.aclose()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
