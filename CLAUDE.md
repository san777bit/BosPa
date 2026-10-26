# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BosPa — Telegram-бот, Mini App и мобильное приложение (`mobile/`, Expo) с картой: загруженность троллейбуса №7 и автобуса №38А в Алматы по отметкам пассажиров и живые позиции бортов. Проектные документы лежат уровнем выше: `../bospa-tech-design.md` (бот, статус, антифрод, баллы) и `../bospa-live-map.md` (карта, слияние источников, ETA). Код, комментарии и тексты бота — на русском.

## Команды

```bash
uv sync                                   # зависимости (в т.ч. dev-группа)
uv run pytest                             # все тесты
uv run pytest tests/test_fusion.py::test_crowd_vehicles_without_official   # один тест
uv run python -m bospa                    # API :8080 + цикл слияния + бот, если в .env есть BOT_TOKEN; нужен Redis (на CachyOS — valkey)
uv run python scripts/demo_map.py         # карта на http://localhost:8080/app/ без Telegram и Redis (fakeredis + смоделированные пассажиры)
uv run python scripts/build_route.py data/specs/b38a.yaml   # пересобрать маршрут в data/routes.yaml (сеть: Overpass, OSRM)
docker compose up -d --build              # продакшен: app + redis + postgres + caddy (HTTPS для Mini App)
```

Запускать из корня проекта: `routes_file` по умолчанию относительный (`data/routes.yaml`). Линтер не настроен.

## Архитектура

Один процесс (`bospa/__main__.py`) через `asyncio.gather` запускает uvicorn с FastAPI, `FusionRunner.run` — фоновый цикл раз в `fusion_interval_s` — и aiogram long polling, если задан `BOT_TOKEN` (без него бот выключен). Состояние между ними передаётся только через Redis; Postgres/SQLite хранит пользователей, журнал баллов и архив.

Слои:
- `domain/` — чистая логика без Redis/Telegram/БД, все функции принимают `now` явно. Здесь вся математика: проекция на линию (`geo.Polyline`), статус с затуханием (`status`), антифрод (`antifraud`), привязка GPS к линии (`mapmatch`), слияние источников (`fusion.fuse`), ETA (`eta`).
- `infra/redis_repo.py` — **все** ключи Redis в одном месте; новые ключи добавлять только сюда.
- `services/` — оркестрация: `CheckinService.report`, `RideService.on_live_location`, `StatusService.direction_views` (общий для бота и API), `FusionRunner.tick`.
- `bot/` — aiogram. Зависимости попадают в обработчики как workflow data `Dispatcher(...)` по имени параметра (`network`, `repo`, `checkins`, `rides`, `statuses`, `sessionmaker`, `settings`). Роутеры модульные: в тестах их отвязывают после каждого прогона (`tests/test_bot.py`).
- `api/` + `webapp/` — FastAPI и статический MapLibre-фронтенд без сборки на `/app/`. Авторизация: Mini App — подпись Telegram `initData` в `X-Telegram-Init-Data`; мобильное приложение — `Authorization: Bearer <token>` от `POST /api/devices` (`services/devices.py`, в БД только sha256). `API_DEV_NO_AUTH` открывает только чтение. Эндпоинты записи (`/api/checkins`, `/api/location`, `/api/ride*`, `/api/me`) вызывают те же `CheckinService`/`RideService`, что и бот.

Ключевые идеи, которые не видны из одного файла:
- **Всё сравнивается по `s`** — расстоянию вдоль линии направления, а не по координатам. Остановки, пассажиры, борта и ETA живут в этой системе; `Direction.segment_index(s)` — номер отрезка между остановками.
- **Два источника позиций.** А — пассажиры «🚌 Я в автобусе»: live-локация Telegram приходит как `edited_message.location`, `mapmatch.match` превращает её в `TrackState` (`obs:crowd:*`). Б — официальный GPS через интерфейс `sources/official.VehicleSource`; сейчас подключён только `NullSource`. `fusion.fuse` привязывает пассажира к официальному борту после 3 совпадений подряд, а без Б склеивает пассажиров в «народные» борта (`crowd:*`). Если по направлению есть официальные данные, непривязанные пассажиры не показываются и не получают баллов.
- **Id бортов:** `off:{ext_id}` — официальные, `crowd:{uuid}` — народные. Чекин пассажира, привязанного к борту, пишется и в `vload:{vehicle_id}`; карточка остановки показывает статус борта, если по нему есть отметки, иначе статус участка.
- **Кольцевые маршруты** (`ring: true`, сейчас 38А): у направления одна линия, конец совпадает с началом. Переход через конечную обрабатывают `mapmatch` (новый круг не считается движением назад), `StatusService` (ETA через конечную) и `Direction.gap`. Маршрут с одним направлением в боте пропускает выбор направления.
- **Мобильное приложение** (`mobile/`, Expo SDK 57, без TypeScript) берёт все данные из API через `mobile/src/services/api.js`; адрес — `EXPO_PUBLIC_API_URL`. Перед работой с Expo API читать `mobile/AGENTS.md` и версионированную документацию. Веб-версии нужен `CORS_ORIGINS` на бэкенде (`demo_map.py` открывает `http://localhost:8081`).
- **Id пользователей:** `users.tg_id` > 0 — Telegram, < 0 — устройство мобильного приложения (`-devices.id`). Сервисы и ключи Redis принимают просто `uid: int`, поэтому источник пользователя для них неважен.
- **Баллы:** баланс в `users.balance` — кэш, источник истины — `points_ledger`; оба меняются в одной транзакции через `services/points.award`. Реферальные +50 B — после первого валидного чекина приглашённого.

## Данные маршрутов

`data/routes.yaml` генерируется, руками его не править — правки вносятся в `data/specs/<route>.yaml` и пересобираются `scripts/build_route.py`: порядок остановок — из публичной страницы маршрута в 2ГИС, координаты — OSM (кэш `data/.cache/osm_stops.json`), линия — OSRM. В спецификации `osm:` задаёт имя остановки в OSM, `approx: true` — остановку, которой нет в OSM (ставится посередине между соседями), `reverse_of:` — обратное направление из тех же остановок. Скрипт печатает участки, где вместо крюка по дорогам поставлен прямой отрезок, — это места для проверки на месте (список и известные сомнительные остановки — в README).

При загрузке (`routes._parse_route`) каждая остановка ищется на линии после предыдущей, поэтому порядок в YAML важен. `scripts/import_osm.py` — старый импортёр прямо из relation OSM; он заменяет только маршруты из `data/osm_sources.yaml`, сейчас этот список пуст. Все маршруты помечены `verified: false`, бот и карта предупреждают об этом.

## Ограничения

Парсинг внутренних API Onay/2ГИС и обход их блокировок в проект не добавляем: источник Б подключается только по официальной договорённости как новая реализация `VehicleSource`. Не сделаны: награды и промокоды, Alembic (схема создаётся `create_all` при старте), админ-команды.
