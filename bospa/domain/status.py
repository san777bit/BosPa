"""Статус загруженности с затуханием по времени и по удалённости остановки."""

from dataclasses import dataclass

GREEN, YELLOW, RED = 0, 1, 2
LEVELS = (GREEN, YELLOW, RED)

HALF_LIFE_S = 5 * 60
WINDOW_S = 15 * 60
MAX_UPSTREAM = 3
UPSTREAM_DECAY = 0.7
MIN_WEIGHT = 0.3
OK_WEIGHT = 1.0

TRUST_OK = 1.0
TRUST_NO_LOCATION = 0.5
TRUST_NONE = 0.0


@dataclass(frozen=True)
class Checkin:
    user_id: int
    level: int
    trust: float
    ts: float
    stop_idx: int = 0


@dataclass(frozen=True)
class Status:
    level: int | None       # None — данных нет
    confidence: str         # "none" | "low" | "ok"
    count: int              # сколько отметок учтено
    score: float | None = None

    @property
    def has_data(self) -> bool:
        return self.level is not None


NO_DATA = Status(None, "none", 0)


def decay_weight(age_s: float) -> float:
    return 0.5 ** (age_s / HALF_LIFE_S)


def compute_status(checkins: list[Checkin], now: float, target_idx: int = 0, spatial: bool = True) -> Status:
    """Взвешенная загруженность.

    spatial=True — статус остановки: учитываются отметки с неё и с MAX_UPSTREAM
    предыдущих остановок с весом 0.7^k.
    spatial=False — статус конкретного борта: отметки «едут» вместе с машиной,
    поэтому штрафа за удалённость нет.
    """
    num = den = 0.0
    n = 0
    for c in checkins:
        age = now - c.ts
        if age > WINDOW_S or age < -60:
            continue
        w = decay_weight(max(age, 0.0)) * c.trust
        if spatial:
            k = target_idx - c.stop_idx
            if not 0 <= k <= MAX_UPSTREAM:
                continue
            w *= UPSTREAM_DECAY ** k
        if w <= 0:
            continue
        num += w * c.level
        den += w
        n += 1
    if den < MIN_WEIGHT:
        return Status(None, "none", n)
    score = num / den
    level = GREEN if score < 0.67 else YELLOW if score < 1.34 else RED
    return Status(level, "low" if den < OK_WEIGHT else "ok", n, score)
