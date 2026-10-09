"""Прогон настоящих апдейтов через диспетчер aiogram без сети: проверяем связку обработчиков."""

import datetime as dt

import pytest
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.base import BaseSession
from aiogram.enums import ParseMode
from aiogram.methods import AnswerCallbackQuery, EditMessageText, GetMe, SendMessage
from aiogram.types import CallbackQuery, Chat, Location, Message, Update, User

from bospa.bot.callbacks import DirCb, ReportCb
from bospa.bot.handlers import flow, ride, start
from bospa.bot import texts
from bospa.config import Settings
from bospa.services.checkins import CheckinService
from bospa.services.rides import RideService
from bospa.services.status import StatusService

from .conftest import at

UID = 42
CHAT = Chat(id=UID, type="private")
USER = User(id=UID, is_bot=False, first_name="Тест")


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.sent: list = []

    async def make_request(self, bot, method, timeout=None):
        self.sent.append(method)
        if isinstance(method, (SendMessage, EditMessageText)):
            return Message(message_id=len(self.sent), date=dt.datetime.now(), chat=CHAT, text=method.text)
        if isinstance(method, AnswerCallbackQuery):
            return True
        if isinstance(method, GetMe):
            return User(id=1, is_bot=True, first_name="BosPa", username="bospa_bot")
        raise AssertionError(f"unexpected method {type(method).__name__}")

    async def close(self):
        pass

    async def stream_content(self, *a, **kw):
        raise NotImplementedError

    def texts(self) -> list[str]:
        return [m.text for m in self.sent if isinstance(m, (SendMessage, EditMessageText))]


@pytest.fixture
def env(network, repo, sessionmaker):
    session = FakeSession()
    bot = Bot("123:abc", session=session, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(
        settings=Settings(bot_token="123:abc", webapp_url="https://example.com/app/"),
        network=network, repo=repo, sessionmaker=sessionmaker,
        statuses=StatusService(network, repo),
        checkins=CheckinService(network, repo, sessionmaker),
        rides=RideService(network, repo, sessionmaker),
    )
    routers = (start.router, ride.router, flow.router)
    dp.include_routers(*routers)
    yield dp, bot, session
    for r in routers:  # роутеры модульные: отвязываем, чтобы следующий тест мог подключить их заново
        r._parent_router = None


_uid = iter(range(1, 10_000))


def msg(**kw) -> Update:
    m = Message(message_id=next(_uid), date=dt.datetime.now(), chat=CHAT, from_user=USER, **kw)
    return Update(update_id=next(_uid), message=m)


def edited(**kw) -> Update:
    m = Message(message_id=7, date=dt.datetime.now(), chat=CHAT, from_user=USER,
                edit_date=int(dt.datetime.now().timestamp()), **kw)
    return Update(update_id=next(_uid), edited_message=m)


def cb(data: str) -> Update:
    m = Message(message_id=1, date=dt.datetime.now(), chat=CHAT, text="…")
    return Update(update_id=next(_uid), callback_query=CallbackQuery(
        id=str(next(_uid)), from_user=USER, chat_instance="x", message=m, data=data))


async def test_start_and_balance(env):
    dp, bot, session = env
    await dp.feed_update(bot, msg(text="/start ref_999"))
    await dp.feed_update(bot, msg(text=texts.BTN_BALANCE))
    out = session.texts()
    assert "BosPa" in out[0]
    assert "0 B" in out[1] and "start=ref_42" in out[1]


async def test_location_then_report_flow(env, repo):
    dp, bot, session = env
    lat, lon = at(1000)
    await dp.feed_update(bot, msg(location=Location(latitude=lat, longitude=lon)))
    assert texts.NEARBY_STOPS in session.texts()[-1]

    await dp.feed_update(bot, cb(DirCb(act="r", route="r1", dir="a").pack()))
    assert "Насколько забит" in session.texts()[-1] and "Остановка 2" in session.texts()[-1]

    await dp.feed_update(bot, cb(ReportCb(route="r1", dir="a", stop="st02", lvl=2).pack()))
    assert "+10 BosPa Points" in session.texts()[-1]

    await dp.feed_update(bot, msg(text=texts.BTN_STATUS))
    card = session.texts()[-1]
    assert "НЕ ВЛЕЗЕШЬ" in card and "1 отметки" in card


async def test_ride_flow(env, repo):
    dp, bot, session = env
    await dp.feed_update(bot, msg(location=Location(latitude=at(0)[0], longitude=at(0)[1], live_period=900)))
    assert session.texts()[-1] == texts.RIDE_NEED_SELECTION

    await dp.feed_update(bot, cb(DirCb(act="b", route="r1", dir="a").pack()))
    assert "Транслировать" in session.texts()[-1]
    await dp.feed_update(bot, msg(location=Location(latitude=at(0)[0], longitude=at(0)[1], live_period=900)))
    assert session.texts()[-1] == texts.RIDE_STARTED
    await dp.feed_update(bot, edited(location=Location(latitude=at(100)[0], longitude=at(100)[1], live_period=900)))
    assert await repo.get_crowd_track("r1", "a", UID) is not None


async def test_single_direction_route_skips_direction_choice(env):
    from bospa.bot.callbacks import RouteCb

    dp, bot, session = env
    await dp.feed_update(bot, cb(RouteCb(act="v", route="r1").pack()))
    assert texts.CHOOSE_STOP in session.texts()[-1]   # сразу список остановок, без «Куда едем?»


async def test_map_button_sends_inline_web_app(env):
    dp, bot, session = env
    await dp.feed_update(bot, msg(text=texts.BTN_MAP))
    markup = session.sent[-1].reply_markup
    assert markup.inline_keyboard[0][0].web_app.url == "https://example.com/app/"
