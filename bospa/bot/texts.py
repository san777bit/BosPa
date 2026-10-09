"""Все строки бота в одном месте."""

from html import escape

from bospa.domain import antifraud as af
from bospa.domain.routes import Direction, Route
from bospa.domain.status import GREEN, RED, YELLOW, Status
from bospa.services.status import StopView

BTN_LOCATION = "📍 Отправить геолокацию"
BTN_MAP = "🗺 Карта"
BTN_OPEN_MAP = "🗺 Открыть карту"
MAP_HINT = "Автобусы, маршрут и загруженность остановок — на карте:"
BTN_STATUS = "🔎 Статус"
BTN_REPORT = "📣 Отметиться"
BTN_RIDE = "🚌 Я в автобусе"
BTN_BALANCE = "💰 Баланс"

LEVEL_BUTTONS = {
    GREEN: "🟢 Свободно",
    YELLOW: "🟡 Плотненько",
    RED: "🔴 Не влезешь",
}
LEVEL_TITLES = {
    GREEN: ("🟢 СВОБОДНО", "Есть сидячие места"),
    YELLOW: ("🟡 ПЛОТНЕНЬКО", "Только стоя, но свободно"),
    RED: ("🔴 НЕ ВЛЕЗЕШЬ", "Салон забит"),
}

WELCOME = (
    "Привет! Это <b>BosPa</b> — «Бос па?», есть ли место.\n\n"
    "Пассажиры отмечают, насколько забит транспорт, а бот показывает, "
    "влезешь ли ты в подъезжающий автобус.\n\n"
    "📍 Отправьте геолокацию — найду ближайшую остановку.\n"
    "📣 Отметьтесь на остановке или в салоне — +10 B.\n"
    "🚌 Едете? Включите «Я в автобусе» — +5 B за каждые 5 минут."
)

CHOOSE_ROUTE = "Выберите маршрут:"
CHOOSE_DIRECTION = "Куда едем?"
CHOOSE_STOP = "Выберите остановку:"
CHOOSE_LEVEL = "📍 «{stop}» · {route} {direction}\n\nНасколько забит салон?"
NEED_LOCATION_HINT = "Совет: отправьте геолокацию — бот сам найдёт ближайшую остановку."
NO_STOPS_NEARBY = "Рядом нет остановок маршрутов BosPa (в радиусе 1 км). Выберите маршрут вручную:"
NEARBY_STOPS = "Ближайшие остановки:"
COOLDOWN = "Вы уже отмечались на этой остановке. Повторно можно через 10 минут."
UNKNOWN_STOP = "Не нашёл такую остановку. Попробуйте ещё раз."

RIDE_INSTRUCTIONS = (
    "🚌 {route} {direction}\n\n"
    "Теперь включите трансляцию геопозиции:\n"
    "📎 → <b>Геопозиция</b> → <b>Транслировать геопозицию</b> (на 15 минут или дольше).\n\n"
    "Пока трансляция идёт, ваш автобус виден на карте всем пассажирам."
)
RIDE_STARTED = "Поехали! Трекинг включён. +5 B за каждые 5 минут поездки."
RIDE_NEED_SELECTION = "Чтобы учесть поездку, сначала нажмите «🚌 Я в автобусе» и выберите маршрут."
RIDE_AWARDED = "🚌 +{points} B за поездку. Баланс: {balance} B."
RIDE_STOPPED = "Трекинг выключен. Не забудьте остановить трансляцию геопозиции в Telegram."
BTN_STOP_RIDE = "⏹ Закончить поездку"

BTN_REFRESH = "🔄 Обновить"
BTN_ME_TOO = "📣 Я тоже здесь"
BTN_OTHER_ROUTE = "↔️ Другой маршрут"
BTN_CHANGE_STOP = "✏️ Другая остановка"
BTN_PREV = "◀️"
BTN_NEXT = "▶️"

REASON_TEXTS = {
    af.NO_LOCATION: "нет свежей геолокации",
    af.FAR_FROM_STOP: "вы далеко от остановки",
    af.TOO_FAST: "слишком быстро после прошлой отметки",
    af.HOURLY_LIMIT: "лимит баллов за час",
    af.NO_OFFICIAL_VEHICLE: "рядом не видно борта этого маршрута",
    af.BANNED: "аккаунт заблокирован",
}

SOURCE_TEXTS = {
    "official": "GPS",
    "fused": "GPS + пассажиры",
    "crowd": "по пассажирам BosPa",
}


def route_label(route: Route) -> str:
    kind = {"trolleybus": "Троллейбус", "bus": "Автобус"}.get(route.kind, "Маршрут")
    return f"{kind} №{route.short}"


def checkin_accepted(points: int, balance: int, reasons: list[str]) -> str:
    if points:
        return (f"⚡️ Спасибо! Ваш чекин учтён. Вам начислено <b>+{points} BosPa Points</b>. "
                f"Ваш баланс: {balance} B.")
    why = ", ".join(REASON_TEXTS.get(r, r) for r in reasons)
    return f"✅ Спасибо! Отметка учтена, но без баллов: {why}."


def balance_text(balance: int, ref_link: str) -> str:
    return (f"💰 Ваш баланс: <b>{balance} B</b>\n\n"
            f"Пригласите друга — +50 B, когда он сделает первую отметку:\n{ref_link}\n\n"
            "Обмен баллов на скидки в кофейнях у остановок появится, когда подключим партнёров.")


def status_card(route: Route, direction: Direction, view: StopView) -> str:
    st: Status = view.status
    lines = [
        f"🚌 <b>{escape(route_label(route))}</b> ({escape(direction.title)})",
        f"📍 Остановка: <b>«{escape(view.stop.name)}»</b>" + (" <i>(место уточняется)</i>" if view.stop.approx else ""),
        _eta_line(view),
    ]
    if st.has_data:
        title, hint = LEVEL_TITLES[st.level]
        lines.append(f"🔥 Статус BosPa: <b>{title}</b> <i>({hint})</i>")
        scope = "по этому борту" if view.by_vehicle else "на этом участке"
        low = " Данных пока мало." if st.confidence == "low" else ""
        lines.append(f"💬 <i>На основе {st.count} {_plural_marks(st.count)} {scope} за 15 минут.{low}</i>")
    else:
        lines.append("🔥 Статус BosPa: <b>⚪️ НЕТ ДАННЫХ</b>")
        lines.append("💬 <i>Отметьтесь первым — +10 B.</i>")
    if not route.verified:
        lines.append("\n⚠️ <i>Данные маршрута ещё проверяются.</i>")
    return "\n".join(lines)


def _eta_line(view: StopView) -> str:
    v = view.vehicle
    if v is None or view.eta_s is None:
        return "⏱ Подъезжающих бортов пока не видно"
    src = SOURCE_TEXTS.get(v["source"], v["source"])
    if v.get("ext_id"):
        src = f"борт {escape(v['ext_id'])}, {src}"
    if v["stale"]:
        src += f", данные {v['age_s']} с назад"
    minutes = round(view.eta_s / 60)
    when = "подъезжает" if minutes < 1 else f"~{minutes} мин"
    return f"⏱ Прибытие: <b>{when}</b> ({src})"


def _plural_marks(n: int) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return "отметки"
    return "отметок"
