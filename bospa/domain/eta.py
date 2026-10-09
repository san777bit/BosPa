"""ETA до остановки по скоростям на отрезках между остановками."""

from datetime import datetime
from zoneinfo import ZoneInfo

from bospa.domain.routes import Direction

TZ = ZoneInfo("Asia/Almaty")
DEFAULT_SPEED_KMH = 18.0
MIN_SPEED_KMH = 3.0      # медленнее — это стоянка, ETA по такой скорости бессмысленно
EMA_ALPHA = 0.2
# Борт чуть «за» остановкой ещё считается подъезжающим: GPS и привязка неточны.
ARRIVAL_SLACK_M = 30.0


def time_bucket(ts: float) -> str:
    """Час и тип дня: скорости в будни в 8 утра и в воскресенье ночью разные."""
    dt = datetime.fromtimestamp(ts, TZ)
    return f"{'we' if dt.weekday() >= 5 else 'wd'}:{dt.hour}"


def ema(prev: float | None, sample: float, alpha: float = EMA_ALPHA) -> float:
    return sample if prev is None else prev + alpha * (sample - prev)


def eta_seconds(direction: Direction, from_s: float, to_s: float, seg_speeds: dict[int, float]) -> float | None:
    """Время в пути от from_s до to_s.

    seg_speeds — средняя скорость (км/ч) по номеру отрезка, см. Direction.segment_index.
    Для отрезков без истории берётся DEFAULT_SPEED_KMH.
    """
    if to_s < from_s - ARRIVAL_SLACK_M:
        return None
    if to_s <= from_s:
        return 0.0
    bounds = [0.0] + [st.s for st in direction.stops] + [direction.line.length]
    total = 0.0
    for i in range(len(bounds) - 1):
        lo, hi = max(from_s, bounds[i]), min(to_s, bounds[i + 1])
        if hi <= lo:
            continue
        speed = max(seg_speeds.get(i - 1, DEFAULT_SPEED_KMH), MIN_SPEED_KMH)
        total += (hi - lo) / (speed / 3.6)
    return total
