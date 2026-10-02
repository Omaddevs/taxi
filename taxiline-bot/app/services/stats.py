"""Admin statistics. All DB timestamps are naive UTC; period boundaries ("today", "7 days")
are computed on the Tashkent calendar (UTC+5, no DST) and converted back to naive UTC."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BotUser, Complaint, DriverProfile, DriverSubscription, Group, Order, SupportTicket

TASHKENT = timezone(timedelta(hours=5))

PERIODS = ("today", "week", "month", "all")
PERIOD_LABELS = {"today": "Bugun", "week": "7 kun", "month": "30 kun", "all": "Hammasi"}

# Subscriptions ending within this many days are reported as "expiring soon".
EXPIRING_SOON_DAYS = 3


def period_start(period: str, now_utc: datetime) -> datetime | None:
    """Naive-UTC start of `period`, or None for all-time."""
    if period == "all":
        return None
    local_midnight = (
        now_utc.replace(tzinfo=timezone.utc).astimezone(TASHKENT).replace(hour=0, minute=0, second=0, microsecond=0)
    )
    days_back = {"today": 0, "week": 6, "month": 29}[period]
    return (local_midnight - timedelta(days=days_back)).astimezone(timezone.utc).replace(tzinfo=None)


@dataclass
class Stats:
    period: str
    generated_at: datetime  # naive UTC

    users_total: int = 0
    clients: int = 0
    drivers_role: int = 0
    admins: int = 0
    users_blocked: int = 0
    users_logged_out: int = 0
    users_new: int = 0
    users_active: int = 0

    drivers_total: int = 0
    drivers_approved: int = 0
    drivers_pending: int = 0
    drivers_rejected: int = 0
    drivers_blocked: int = 0
    drivers_not_joined: int = 0
    drivers_new: int = 0
    no_shows: int = 0

    subs_active: int = 0
    subs_expiring: int = 0
    subs_inactive: int = 0

    orders_created: int = 0
    orders_by_source: dict[str, int] = field(default_factory=dict)
    orders_passengers: int = 0
    completed: int = 0
    closed: int = 0
    cancelled: int = 0
    completed_passengers: int = 0
    avg_claim_minutes: float | None = None
    top_routes: list[tuple[str, str, int]] = field(default_factory=list)

    open_now: int = 0
    waiting_driver_now: int = 0
    enroute_now: int = 0

    complaints_new: int = 0
    complaints_open: int = 0
    complaints_in_progress: int = 0
    tickets_new: int = 0
    tickets_open: int = 0

    groups_by_kind: dict[str, int] = field(default_factory=dict)

    @property
    def finished(self) -> int:
        return self.completed + self.closed + self.cancelled

    @property
    def success_rate(self) -> float | None:
        """Share of finished orders that ended as a real completed trip."""
        return self.completed / self.finished * 100 if self.finished else None


def _count(*conditions):
    """COUNT(*) FILTER (WHERE ...) — lets one SELECT compute many counters at once."""
    return func.count().filter(and_(*conditions)) if conditions else func.count()


async def collect(session: AsyncSession, period: str) -> Stats:
    if period not in PERIODS:
        period = "today"
    now = datetime.utcnow()
    start = period_start(period, now)
    s = Stats(period=period, generated_at=now)

    def since(column):
        return column >= start if start is not None else column.isnot(None)

    # Users — "active" = interacted with the bot within the period (last 30 days for all-time).
    active_since = start if start is not None else now - timedelta(days=30)
    row = (
        await session.execute(
            select(
                _count(),
                _count(BotUser.role == "CLIENT"),
                _count(BotUser.role == "DRIVER"),
                _count(BotUser.is_admin.is_(True)),
                _count(BotUser.blocked.is_(True)),
                _count(BotUser.logged_out.is_(True)),
                _count(since(BotUser.registered_at)),
                _count(BotUser.last_seen_at >= active_since),
            ).select_from(BotUser)
        )
    ).one()
    (
        s.users_total,
        s.clients,
        s.drivers_role,
        s.admins,
        s.users_blocked,
        s.users_logged_out,
        s.users_new,
        s.users_active,
    ) = row

    # Drivers
    row = (
        await session.execute(
            select(
                _count(),
                _count(DriverProfile.status == "APPROVED"),
                _count(DriverProfile.status == "PENDING"),
                _count(DriverProfile.status == "REJECTED"),
                _count(DriverProfile.blocked.is_(True)),
                _count(DriverProfile.status == "APPROVED", DriverProfile.joined_group_at.is_(None)),
                _count(since(DriverProfile.created_at)),
                func.coalesce(func.sum(DriverProfile.no_show_count), 0),
            ).select_from(DriverProfile)
        )
    ).one()
    (
        s.drivers_total,
        s.drivers_approved,
        s.drivers_pending,
        s.drivers_rejected,
        s.drivers_blocked,
        s.drivers_not_joined,
        s.drivers_new,
        s.no_shows,
    ) = row

    # Subscriptions — "active" must be both flagged active and not yet past expires_at, since
    # the expiry job only flips the flag periodically.
    live = and_(DriverSubscription.active.is_(True), DriverSubscription.expires_at > now)
    row = (
        await session.execute(
            select(
                _count(live),
                _count(live, DriverSubscription.expires_at <= now + timedelta(days=EXPIRING_SOON_DAYS)),
                _count(~live),
            ).select_from(DriverSubscription)
        )
    ).one()
    s.subs_active, s.subs_expiring, s.subs_inactive = row

    # Orders created in the period
    created = since(Order.created_at)
    row = (
        await session.execute(
            select(
                _count(),
                func.coalesce(func.sum(Order.passengers), 0),
                func.avg(
                    case(
                        (Order.claimed_at.isnot(None), func.extract("epoch", Order.claimed_at - Order.created_at)),
                    )
                ),
            ).where(created)
        )
    ).one()
    s.orders_created, s.orders_passengers, avg_claim_seconds = row
    if avg_claim_seconds is not None and avg_claim_seconds >= 0:
        s.avg_claim_minutes = float(avg_claim_seconds) / 60

    rows = await session.execute(select(Order.source, func.count()).where(created).group_by(Order.source))
    s.orders_by_source = {source: n for source, n in rows.all()}

    rows = await session.execute(
        select(Order.from_region, Order.to_region, func.count().label("n"))
        .where(created)
        .group_by(Order.from_region, Order.to_region)
        .order_by(func.count().desc(), Order.from_region, Order.to_region)
        .limit(5)
    )
    s.top_routes = [(a, b, n) for a, b, n in rows.all()]

    # Orders finished in the period (by when they finished, not when they were created)
    finished = since(Order.finished_at)
    row = (
        await session.execute(
            select(
                _count(finished, Order.status == "COMPLETED"),
                _count(finished, Order.status == "CLOSED"),
                _count(finished, Order.status == "CANCELLED"),
                func.coalesce(
                    func.sum(Order.passengers).filter(and_(finished, Order.status == "COMPLETED")), 0
                ),
            ).select_from(Order)
        )
    ).one()
    s.completed, s.closed, s.cancelled, s.completed_passengers = row

    # Live pipeline — always "right now", independent of the period
    row = (
        await session.execute(
            select(
                _count(Order.status == "OPEN"),
                _count(Order.status == "CLAIMED", Order.confirmed_at.is_(None)),
                _count(Order.status == "CLAIMED", Order.confirmed_at.isnot(None)),
            ).select_from(Order)
        )
    ).one()
    s.open_now, s.waiting_driver_now, s.enroute_now = row

    row = (
        await session.execute(
            select(
                _count(since(Complaint.created_at)),
                _count(Complaint.status == "OPEN"),
                _count(Complaint.status == "IN_PROGRESS"),
            ).select_from(Complaint)
        )
    ).one()
    s.complaints_new, s.complaints_open, s.complaints_in_progress = row

    row = (
        await session.execute(
            select(_count(since(SupportTicket.created_at)), _count(SupportTicket.status == "OPEN")).select_from(
                SupportTicket
            )
        )
    ).one()
    s.tickets_new, s.tickets_open = row

    rows = await session.execute(select(Group.kind, func.count()).group_by(Group.kind))
    s.groups_by_kind = {kind: n for kind, n in rows.all()}

    return s
