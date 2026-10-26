"""Анонимная авторизация мобильного приложения по токену устройства."""

import hashlib
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.infra.models import Device
from bospa.services.points import get_or_create_user


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class DeviceService:
    def __init__(self, sessionmaker: async_sessionmaker):
        self.sessionmaker = sessionmaker

    async def register(self) -> tuple[int, str]:
        """Новое устройство: (id пользователя, токен). Токен больше нигде не узнать."""
        token = secrets.token_urlsafe(32)
        async with self.sessionmaker() as session, session.begin():
            device = Device(token_hash=hash_token(token))
            session.add(device)
            await session.flush()
            user, _ = await get_or_create_user(session, -device.id)
        return user.tg_id, token

    async def resolve(self, token: str) -> int | None:
        """id пользователя по токену или None, если токен неизвестен."""
        async with self.sessionmaker() as session:
            device_id = await session.scalar(select(Device.id).where(Device.token_hash == hash_token(token)))
        return -device_id if device_id is not None else None
