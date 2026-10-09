from aiogram import F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message
from sqlalchemy.ext.asyncio import async_sessionmaker

from bospa.bot import keyboards as kb
from bospa.bot import texts
from bospa.config import Settings
from bospa.services.points import get_or_create_user

router = Router(name="start")


@router.message(CommandStart())
async def start(message: Message, command: CommandObject, sessionmaker: async_sessionmaker, settings: Settings):
    referrer = None
    if command.args and command.args.startswith("ref_"):
        try:
            referrer = int(command.args.removeprefix("ref_"))
        except ValueError:
            pass
    async with sessionmaker() as session, session.begin():
        await get_or_create_user(session, message.from_user.id, referrer)
    await message.answer(texts.WELCOME, reply_markup=kb.main_menu(settings.webapp_url))


@router.message(F.text == texts.BTN_BALANCE)
async def balance(message: Message, sessionmaker: async_sessionmaker):
    async with sessionmaker() as session, session.begin():
        user, _ = await get_or_create_user(session, message.from_user.id)
        value = user.balance
    me = await message.bot.me()
    link = f"https://t.me/{me.username}?start=ref_{message.from_user.id}"
    await message.answer(texts.balance_text(value, link))


@router.message(F.text == texts.BTN_MAP)
async def open_map(message: Message, settings: Settings):
    if settings.webapp_url:
        await message.answer(texts.MAP_HINT, reply_markup=kb.map_link(settings.webapp_url))
