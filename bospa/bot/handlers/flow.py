"""Сценарии «🔎 Статус» и «📣 Отметиться»: маршрут → направление → остановка."""

import time

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, Message

from bospa.bot import keyboards as kb
from bospa.bot import texts
from bospa.bot.callbacks import (
    ACT_REPORT, ACT_RIDE, ACT_VIEW, DirCb, LevelsCb, ReportCb, RouteCb, StopListCb, ViewCb,
)
from bospa.domain.antifraud import Point
from bospa.domain.routes import Direction, Network
from bospa.infra.redis_repo import RedisRepo
from bospa.services.checkins import CheckinService
from bospa.services.rides import RideService
from bospa.services.status import StatusService

router = Router(name="flow")

NEARBY_RADIUS_M = 1000.0


# --- точки входа -------------------------------------------------------------

@router.message(F.text == texts.BTN_STATUS)
async def status_entry(message: Message, network: Network, repo: RedisRepo, statuses: StatusService):
    pref = await repo.get_pref(message.from_user.id)
    direction = network.direction(*pref) if pref else None
    if direction is None:
        await message.answer(texts.CHOOSE_ROUTE, reply_markup=kb.routes(network, ACT_VIEW))
        return
    await _continue(message, direction, ACT_VIEW, network, repo, statuses)


@router.message(F.text == texts.BTN_REPORT)
async def report_entry(message: Message, network: Network, repo: RedisRepo, statuses: StatusService):
    uid = message.from_user.id
    # В поездке остановку берём по положению автобуса на линии
    sel = await repo.get_ride_selection(uid)
    if sel and (direction := network.direction(*sel)):
        track = await repo.get_crowd_track(*sel, uid)
        if track:
            stop = min(direction.stops, key=lambda s: abs(s.s - track.s))
            await _send_levels(message, network, direction, stop.id)
            return
    pref = await repo.get_pref(uid)
    direction = network.direction(*pref) if pref else None
    if direction is None:
        await message.answer(texts.CHOOSE_ROUTE, reply_markup=kb.routes(network, ACT_REPORT))
        return
    await _continue(message, direction, ACT_REPORT, network, repo, statuses)


@router.message(F.location & ~F.location.live_period)
async def on_location(message: Message, network: Network, repo: RedisRepo):
    loc = message.location
    await repo.set_location(message.from_user.id, Point(loc.latitude, loc.longitude, time.time()))
    items = network.nearby(loc.latitude, loc.longitude, NEARBY_RADIUS_M)
    if not items:
        await message.answer(texts.NO_STOPS_NEARBY, reply_markup=kb.routes(network, ACT_VIEW))
        return
    await message.answer(texts.NEARBY_STOPS, reply_markup=kb.nearby(items[:6], network))


# --- выбор маршрута, направления, остановки ------------------------------------

@router.callback_query(RouteCb.filter())
async def on_route(cq: CallbackQuery, callback_data: RouteCb, network: Network, repo: RedisRepo,
                   statuses: StatusService, rides: RideService):
    route = network.routes.get(callback_data.route)
    if route is None:
        await cq.message.edit_text(texts.CHOOSE_ROUTE, reply_markup=kb.routes(network, callback_data.act))
        await cq.answer()
        return
    if len(route.directions) == 1:
        # Кольцевой маршрут: выбирать направление не из чего
        (dir_id,) = route.directions
        dir_cb = DirCb(act=callback_data.act, route=route.id, dir=dir_id)
        if callback_data.act == ACT_RIDE:
            await on_ride_direction(cq, dir_cb, network, rides)
        else:
            await on_direction(cq, dir_cb, network, repo, statuses)
        return
    await cq.message.edit_text(texts.CHOOSE_DIRECTION,
                               reply_markup=kb.directions(network, callback_data.act, callback_data.route))
    await cq.answer()


@router.callback_query(DirCb.filter(F.act.in_({ACT_VIEW, ACT_REPORT})))
async def on_direction(cq: CallbackQuery, callback_data: DirCb, network: Network, repo: RedisRepo,
                       statuses: StatusService):
    direction = network.direction(callback_data.route, callback_data.dir)
    if direction is None:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    await repo.set_pref(cq.from_user.id, direction.route_id, direction.id)
    await cq.answer()
    await _continue(cq.message, direction, callback_data.act, network, repo, statuses,
                    uid=cq.from_user.id, edit=True)


@router.callback_query(StopListCb.filter())
async def on_stop_list(cq: CallbackQuery, callback_data: StopListCb, network: Network):
    direction = network.direction(callback_data.route, callback_data.dir)
    if direction is None:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    await cq.message.edit_text(texts.CHOOSE_STOP,
                               reply_markup=kb.stops(direction, callback_data.act, callback_data.page))
    await cq.answer()


async def _continue(message: Message, direction: Direction, act: str, network: Network, repo: RedisRepo,
                    statuses: StatusService, uid: int | None = None, edit: bool = False):
    """Есть свежая геолокация — сразу ближайшая остановка, иначе список остановок."""
    uid = uid or message.from_user.id
    loc = await repo.get_location(uid)
    if loc is None:
        text = f"{texts.CHOOSE_STOP}\n\n<i>{texts.NEED_LOCATION_HINT}</i>"
        markup = kb.stops(direction, act, 0)
        await (message.edit_text(text, reply_markup=markup) if edit else message.answer(text, reply_markup=markup))
        return
    _, stop = direction.nearest_stop(loc.lat, loc.lon)
    if act == ACT_REPORT:
        await _send_levels(message, network, direction, stop.id, edit)
    else:
        await _send_card(message, network, direction, stop.id, statuses, edit)


# --- карточка статуса -----------------------------------------------------------

@router.callback_query(ViewCb.filter())
async def on_view(cq: CallbackQuery, callback_data: ViewCb, network: Network, repo: RedisRepo,
                  statuses: StatusService):
    direction = network.direction(callback_data.route, callback_data.dir)
    if direction is None or direction.stop(callback_data.stop) is None:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    await repo.set_pref(cq.from_user.id, direction.route_id, direction.id)
    await _send_card(cq.message, network, direction, callback_data.stop, statuses, edit=True)
    await cq.answer()


async def _send_card(message: Message, network: Network, direction: Direction, stop_id: str,
                     statuses: StatusService, edit: bool = False):
    view = await statuses.stop_view(direction, stop_id, time.time())
    text = texts.status_card(network.routes[direction.route_id], direction, view)
    markup = kb.status_card(direction.route_id, direction.id, stop_id)
    if edit:
        try:
            await message.edit_text(text, reply_markup=markup)
        except TelegramBadRequest as e:
            # «🔄 Обновить» без изменений: Telegram не даёт заменить сообщение тем же текстом
            if "message is not modified" not in str(e):
                raise
    else:
        await message.answer(text, reply_markup=markup)


# --- чекин ------------------------------------------------------------------------

@router.callback_query(LevelsCb.filter())
async def on_levels(cq: CallbackQuery, callback_data: LevelsCb, network: Network):
    direction = network.direction(callback_data.route, callback_data.dir)
    if direction is None or direction.stop(callback_data.stop) is None:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    await _send_levels(cq.message, network, direction, callback_data.stop, edit=True)
    await cq.answer()


async def _send_levels(message: Message, network: Network, direction: Direction, stop_id: str,
                       edit: bool = False):
    stop = direction.stop(stop_id)
    route = network.routes[direction.route_id]
    text = texts.CHOOSE_LEVEL.format(stop=stop.name, route=texts.route_label(route), direction=direction.title)
    markup = kb.levels(direction.route_id, direction.id, stop_id)
    await (message.edit_text(text, reply_markup=markup) if edit else message.answer(text, reply_markup=markup))


@router.callback_query(ReportCb.filter())
async def on_report(cq: CallbackQuery, callback_data: ReportCb, checkins: CheckinService):
    try:
        res = await checkins.report(cq.from_user.id, callback_data.route, callback_data.dir,
                                    callback_data.stop, callback_data.lvl, time.time())
    except ValueError:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    if not res.accepted:
        await cq.answer(texts.COOLDOWN, show_alert=True)
        return
    await cq.message.edit_text(texts.checkin_accepted(res.points, res.balance, res.reasons))
    await cq.answer()


# --- «🚌 Я в автобусе»: выбор направления --------------------------------------------

@router.callback_query(DirCb.filter(F.act == ACT_RIDE))
async def on_ride_direction(cq: CallbackQuery, callback_data: DirCb, network: Network, rides: RideService):
    direction = network.direction(callback_data.route, callback_data.dir)
    if direction is None:
        await cq.answer(texts.UNKNOWN_STOP)
        return
    await rides.select(cq.from_user.id, direction.route_id, direction.id)
    route = network.routes[direction.route_id]
    await cq.message.edit_text(
        texts.RIDE_INSTRUCTIONS.format(route=texts.route_label(route), direction=direction.title),
        reply_markup=kb.stop_ride())
    await cq.answer()
