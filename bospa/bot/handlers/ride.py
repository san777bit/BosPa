"""«🚌 Я в автобусе»: приём трансляции геопозиции."""

import time

from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from bospa.bot import keyboards as kb
from bospa.bot import texts
from bospa.bot.callbacks import ACT_RIDE, StopRideCb
from bospa.domain.routes import Network
from bospa.services.rides import RideService

router = Router(name="ride")


@router.message(F.text == texts.BTN_RIDE)
async def ride_entry(message: Message, network: Network):
    await message.answer(texts.CHOOSE_ROUTE, reply_markup=kb.routes(network, ACT_RIDE))


@router.message(F.location.live_period)
async def live_started(message: Message, rides: RideService):
    loc = message.location
    upd = await rides.on_live_location(message.from_user.id, loc.latitude, loc.longitude, time.time(), started=True)
    if upd is None:
        await message.answer(texts.RIDE_NEED_SELECTION)
        return
    await message.answer(texts.RIDE_STARTED, reply_markup=kb.stop_ride())


@router.edited_message(F.location)
async def live_updated(message: Message, rides: RideService):
    loc = message.location
    upd = await rides.on_live_location(message.from_user.id, loc.latitude, loc.longitude, time.time(), started=False)
    if upd and upd.awarded:
        await message.answer(texts.RIDE_AWARDED.format(points=upd.awarded, balance=upd.balance))


@router.callback_query(StopRideCb.filter())
async def stop_ride(cq: CallbackQuery, rides: RideService):
    await rides.stop(cq.from_user.id)
    await cq.message.edit_text(texts.RIDE_STOPPED)
    await cq.answer()
