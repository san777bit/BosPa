"""Данные inline-кнопок. Telegram ограничивает их 64 байтами, поэтому префиксы короткие.

act — какой сценарий продолжает выбор маршрута: v — статус, r — чекин, b — «я в автобусе».
"""

from aiogram.filters.callback_data import CallbackData

ACT_VIEW, ACT_REPORT, ACT_RIDE = "v", "r", "b"


class RouteCb(CallbackData, prefix="P"):
    act: str
    route: str


class DirCb(CallbackData, prefix="D"):
    act: str
    route: str
    dir: str


class StopListCb(CallbackData, prefix="S"):
    act: str
    route: str
    dir: str
    page: int = 0


class ViewCb(CallbackData, prefix="V"):
    route: str
    dir: str
    stop: str


class LevelsCb(CallbackData, prefix="L"):
    route: str
    dir: str
    stop: str


class ReportCb(CallbackData, prefix="R"):
    route: str
    dir: str
    stop: str
    lvl: int


class StopRideCb(CallbackData, prefix="X"):
    pass
