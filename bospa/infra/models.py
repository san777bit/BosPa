from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    tg_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    referrer_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.tg_id"))
    # Пригласившему уже начислены +50 B за этого пользователя
    referral_rewarded: Mapped[bool] = mapped_column(Boolean, default=False)
    # Кэш суммы по points_ledger; меняется только вместе с записью в журнал
    balance: Mapped[int] = mapped_column(Integer, default=0)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)


class CheckinRow(Base):
    __tablename__ = "checkins"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.tg_id"), index=True)
    route: Mapped[str] = mapped_column(String(16))
    dir: Mapped[str] = mapped_column(String(8))
    stop_id: Mapped[str] = mapped_column(String(32))
    vehicle_id: Mapped[str | None] = mapped_column(String(64))
    level: Mapped[int] = mapped_column(SmallInteger)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    trust: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    rewarded: Mapped[bool] = mapped_column(Boolean, default=False)
    reject_reason: Mapped[str | None] = mapped_column(Text)


class PointsLedger(Base):
    """Источник истины по баллам."""
    __tablename__ = "points_ledger"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.tg_id"), index=True)
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(16))   # checkin | ride | referral | redeem | admin
    ref_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TrackPoint(Base):
    """История треков обоих источников — для скоростей по отрезкам."""
    __tablename__ = "track_points"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    source: Mapped[str] = mapped_column(String(8))     # official | fused | crowd
    route: Mapped[str] = mapped_column(String(16))
    dir: Mapped[str] = mapped_column(String(8))
    vehicle_id: Mapped[str] = mapped_column(String(64), index=True)
    s: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    speed_kmh: Mapped[float] = mapped_column(Float)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class VehicleRow(Base):
    """Справочник официальных бортов (заполняется, когда появится источник Б)."""
    __tablename__ = "vehicles"

    ext_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    route: Mapped[str] = mapped_column(String(16))
    kind: Mapped[str] = mapped_column(String(16))
