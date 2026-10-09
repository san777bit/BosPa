from sqlalchemy.ext.asyncio import AsyncSession

from bospa.infra.models import PointsLedger, User

CHECKIN_POINTS = 10
RIDE_POINTS = 5
RIDE_AWARD_PERIOD_S = 5 * 60
REFERRAL_POINTS = 50


async def get_or_create_user(session: AsyncSession, tg_id: int, referrer_id: int | None = None) -> tuple[User, bool]:
    user = await session.get(User, tg_id)
    if user:
        return user, False
    if referrer_id == tg_id or (referrer_id and not await session.get(User, referrer_id)):
        referrer_id = None
    user = User(tg_id=tg_id, referrer_id=referrer_id, balance=0)
    session.add(user)
    await session.flush()
    return user, True


async def award(session: AsyncSession, user: User, delta: int, reason: str, ref_id: int | None = None) -> int:
    """Начисление или списание. Журнал и кэш баланса меняются в одной транзакции вызывающего."""
    session.add(PointsLedger(user_id=user.tg_id, delta=delta, reason=reason, ref_id=ref_id))
    user.balance += delta
    await session.flush()
    return user.balance
