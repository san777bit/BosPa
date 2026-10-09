"""Источник Б: официальные GPS-данные.

Конкретный адаптер пишется, когда появится договорённость с акиматом, Onay или 2ГИС.
Парсинг их внутренних API без разрешения сюда не добавляем.
"""

from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True)
class Observation:
    source: Literal["official", "crowd"]
    route: str
    direction: str
    lat: float
    lon: float
    ts: float
    vehicle_ext_id: str | None = None   # только у official
    user_id: int | None = None          # только у crowd


class VehicleSource(Protocol):
    name: str

    async def fetch(self) -> list[Observation]:
        """Последние позиции бортов по маршрутам BosPa."""
        ...


class NullSource:
    """Заглушка, пока официального доступа нет: маршруты работают только на источнике А."""
    name = "null"

    async def fetch(self) -> list[Observation]:
        return []
