from aiogram.types import InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bospa.bot import texts
from bospa.bot.callbacks import (
    DirCb, LevelsCb, ReportCb, RouteCb, StopListCb, StopRideCb, ViewCb,
)
from bospa.domain.routes import Direction, Network
from bospa.domain.status import LEVELS

STOPS_PER_PAGE = 8


def main_menu(webapp_url: str | None) -> ReplyKeyboardMarkup:
    first = [KeyboardButton(text=texts.BTN_LOCATION, request_location=True)]
    if webapp_url:
        # Mini App с reply-клавиатуры не получает initData, поэтому здесь обычная кнопка,
        # а карта открывается inline-кнопкой (map_link) или кнопкой меню бота.
        first.append(KeyboardButton(text=texts.BTN_MAP))
    return ReplyKeyboardMarkup(
        keyboard=[
            first,
            [KeyboardButton(text=texts.BTN_STATUS), KeyboardButton(text=texts.BTN_REPORT)],
            [KeyboardButton(text=texts.BTN_RIDE), KeyboardButton(text=texts.BTN_BALANCE)],
        ],
        resize_keyboard=True,
        is_persistent=True,
    )


def routes(network: Network, act: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for r in network.routes.values():
        kb.button(text=texts.route_label(r), callback_data=RouteCb(act=act, route=r.id))
    kb.adjust(1)
    return kb.as_markup()


def directions(network: Network, act: str, route_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for d in network.routes[route_id].directions.values():
        kb.button(text=d.title, callback_data=DirCb(act=act, route=route_id, dir=d.id))
    kb.adjust(1)
    return kb.as_markup()


def stops(direction: Direction, act: str, page: int) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    chunk = direction.stops[page * STOPS_PER_PAGE:(page + 1) * STOPS_PER_PAGE]
    for st in chunk:
        if act == "r":
            cb = LevelsCb(route=direction.route_id, dir=direction.id, stop=st.id)
        else:
            cb = ViewCb(route=direction.route_id, dir=direction.id, stop=st.id)
        kb.button(text=st.name, callback_data=cb)
    kb.adjust(1)
    nav = []
    pages = (len(direction.stops) - 1) // STOPS_PER_PAGE + 1
    if page > 0:
        nav.append((texts.BTN_PREV, page - 1))
    if page + 1 < pages:
        nav.append((texts.BTN_NEXT, page + 1))
    if nav:
        nav_kb = InlineKeyboardBuilder()
        for text, p in nav:
            nav_kb.button(text=text, callback_data=StopListCb(act=act, route=direction.route_id,
                                                              dir=direction.id, page=p))
        kb.attach(nav_kb)
    return kb.as_markup()


def levels(route_id: str, dir_id: str, stop_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for lvl in LEVELS:
        kb.button(text=texts.LEVEL_BUTTONS[lvl],
                  callback_data=ReportCb(route=route_id, dir=dir_id, stop=stop_id, lvl=lvl))
    kb.button(text=texts.BTN_CHANGE_STOP, callback_data=StopListCb(act="r", route=route_id, dir=dir_id))
    kb.adjust(1)
    return kb.as_markup()


def status_card(route_id: str, dir_id: str, stop_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=texts.BTN_REFRESH, callback_data=ViewCb(route=route_id, dir=dir_id, stop=stop_id))
    kb.button(text=texts.BTN_ME_TOO, callback_data=LevelsCb(route=route_id, dir=dir_id, stop=stop_id))
    kb.button(text=texts.BTN_CHANGE_STOP, callback_data=StopListCb(act="v", route=route_id, dir=dir_id))
    kb.button(text=texts.BTN_OTHER_ROUTE, callback_data=RouteCb(act="v", route="*"))
    kb.adjust(2, 2)
    return kb.as_markup()


def nearby(items: list[tuple[float, Direction, object]], network: Network) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for dist, d, stop in items:
        route = network.routes[d.route_id]
        kb.button(text=f"{route.short} {d.title} · «{stop.name}» {dist:.0f} м",
                  callback_data=ViewCb(route=d.route_id, dir=d.id, stop=stop.id))
    kb.adjust(1)
    return kb.as_markup()


def map_link(webapp_url: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=texts.BTN_OPEN_MAP, web_app=WebAppInfo(url=webapp_url))
    return kb.as_markup()


def stop_ride() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=texts.BTN_STOP_RIDE, callback_data=StopRideCb())
    return kb.as_markup()
