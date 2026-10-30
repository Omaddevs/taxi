"""Admin panel bosh sahifasi: Telegram guruhlarida tashlangan e'lonlar va bot foydalanuvchilari
statistikasi. Kunlar Toshkent kalendari bo'yicha (UTC+5); bazadagi vaqtlar naive UTC.

E'lon manbalari:
* formatted_ads — `format_ads` guruhlarida bot TaxiLine sarlavhasi bilan qayta joylagan e'lonlar
  (haydovchi yoki yo'lovchi — `is_passenger`);
* group_ads    — `ad_router` guruhlarida "yo'lovchimisiz yoki haydovchi?" deb so'ralgan xabarlar.
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BotUser, CallLog, FormattedAd, Group, GroupAd, GroupPostEvent

TASHKENT = timezone(timedelta(hours=5))


def _local(moment: datetime) -> datetime:
    return moment.replace(tzinfo=timezone.utc).astimezone(TASHKENT)


def _day(moment: datetime) -> str:
    return _local(moment).strftime("%Y-%m-%d")


async def report(session: AsyncSession, days: int) -> dict:
    now = datetime.utcnow()
    local_midnight = _local(now).replace(hour=0, minute=0, second=0, microsecond=0)
    start_local = local_midnight - timedelta(days=days - 1)
    since = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    prev_since = (start_local - timedelta(days=days)).astimezone(timezone.utc).replace(tzinfo=None)
    # The daily chart always shows at least a week, so "Bugun" still has something to compare with.
    series_days = max(days, 7)
    series_start_local = local_midnight - timedelta(days=series_days - 1)
    series_since = series_start_local.astimezone(timezone.utc).replace(tzinfo=None)
    window = min(since, series_since)

    formatted = (
        await session.execute(
            select(
                FormattedAd.created_at,
                FormattedAd.chat_id,
                FormattedAd.is_passenger,
                FormattedAd.author_telegram_id,
                FormattedAd.author_name,
                FormattedAd.author_username,
                FormattedAd.has_photo,
            ).where(FormattedAd.created_at >= window)
        )
    ).all()
    routed = (
        await session.execute(
            select(
                GroupAd.created_at,
                GroupAd.source_chat_id,
                GroupAd.role,
                GroupAd.status,
                GroupAd.author_telegram_id,
                GroupAd.author_name,
                GroupAd.author_username,
            ).where(GroupAd.created_at >= window)
        )
    ).all()
    calls = (
        await session.execute(select(CallLog.created_at, CallLog.chat_id).where(CallLog.created_at >= window))
    ).all()

    # One flat list of ads: (created_at, chat_id, role, author_id, name, username).
    ads: list[tuple[datetime, int, str | None, int, str, str | None]] = [
        (r.created_at, r.chat_id, "PASSENGER" if r.is_passenger else "DRIVER", r.author_telegram_id, r.author_name, r.author_username)
        for r in formatted
    ] + [
        (r.created_at, r.source_chat_id, r.role, r.author_telegram_id, r.author_name, r.author_username)
        for r in routed
    ]
    in_range = [a for a in ads if a[0] >= since]

    prev_ads = await session.scalar(
        select(func.count()).select_from(FormattedAd).where(FormattedAd.created_at >= prev_since, FormattedAd.created_at < since)
    ) or 0
    prev_ads += await session.scalar(
        select(func.count()).select_from(GroupAd).where(GroupAd.created_at >= prev_since, GroupAd.created_at < since)
    ) or 0
    prev_calls = await session.scalar(
        select(func.count()).select_from(CallLog).where(CallLog.created_at >= prev_since, CallLog.created_at < since)
    ) or 0

    blocked = await session.scalar(
        select(func.count())
        .select_from(GroupPostEvent)
        .where(GroupPostEvent.kind == "STRIKE", GroupPostEvent.created_at >= since)
    ) or 0

    role_counts = Counter(a[2] or "UNKNOWN" for a in in_range)
    range_calls = [c for c in calls if c.created_at >= since]

    # ── daily series ──
    driver_by_day: Counter[str] = Counter()
    passenger_by_day: Counter[str] = Counter()
    calls_by_day: Counter[str] = Counter()
    for created_at, _chat, role, *_ in ads:
        if created_at < series_since:
            continue
        if role == "PASSENGER":
            passenger_by_day[_day(created_at)] += 1
        elif role == "DRIVER":
            driver_by_day[_day(created_at)] += 1
    for c in calls:
        if c.created_at >= series_since:
            calls_by_day[_day(c.created_at)] += 1
    series = []
    for i in range(series_days):
        key = (series_start_local + timedelta(days=i)).strftime("%Y-%m-%d")
        series.append(
            {"date": key, "driver": driver_by_day[key], "passenger": passenger_by_day[key], "calls": calls_by_day[key]}
        )

    # ── by hour of day (Tashkent), selected range ──
    hours = [0] * 24
    for a in in_range:
        hours[_local(a[0]).hour] += 1

    # ── by group ──
    per_chat: dict[int, Counter] = defaultdict(Counter)
    for created_at, chat_id, role, *_ in in_range:
        per_chat[chat_id]["ads"] += 1
        per_chat[chat_id]["passenger" if role == "PASSENGER" else "driver" if role == "DRIVER" else "unknown"] += 1
    for c in range_calls:
        if c.chat_id is not None:
            per_chat[c.chat_id]["calls"] += 1
    groups = (await session.execute(select(Group.chat_id, Group.title, Group.kind))).all()
    group_meta = {g.chat_id: (g.title, g.kind) for g in groups}
    top_groups = sorted(per_chat.items(), key=lambda item: item[1]["ads"], reverse=True)[:8]

    # ── most active authors ──
    authors: dict[int, dict] = {}
    for _created, _chat, role, author_id, name, username in in_range:
        if not author_id:
            continue  # typed in from the dashboard
        row = authors.setdefault(author_id, {"telegramId": str(author_id), "name": name, "username": username, "ads": 0, "role": role})
        row["ads"] += 1
    top_authors = sorted(authors.values(), key=lambda r: r["ads"], reverse=True)[:6]

    # ── ad_router outcomes ──
    routed_status = Counter(r.status for r in routed if r.created_at >= since)

    # ── bot users ──
    users_total = await session.scalar(select(func.count()).select_from(BotUser)) or 0
    users_drivers = await session.scalar(select(func.count()).select_from(BotUser).where(BotUser.role == "DRIVER")) or 0
    users_blocked = await session.scalar(select(func.count()).select_from(BotUser).where(BotUser.blocked.is_(True))) or 0
    users_new = await session.scalar(select(func.count()).select_from(BotUser).where(BotUser.registered_at >= since)) or 0
    users_active = await session.scalar(select(func.count()).select_from(BotUser).where(BotUser.last_seen_at >= since)) or 0
    new_rows = (await session.execute(select(BotUser.registered_at).where(BotUser.registered_at >= series_since))).scalars()
    new_by_day = Counter(_day(r) for r in new_rows)

    return {
        "days": days,
        "from": since.isoformat() + "Z",
        "totals": {
            "ads": len(in_range),
            "driver": role_counts["DRIVER"],
            "passenger": role_counts["PASSENGER"],
            "unknown": role_counts["UNKNOWN"],
            "withPhoto": sum(1 for r in formatted if r.created_at >= since and r.has_photo),
            "authors": len(authors),
            "calls": len(range_calls),
            "blocked": blocked,
            "activeGroups": len(per_chat),
        },
        "previous": {"ads": prev_ads, "calls": prev_calls},
        "series": series,
        "hours": hours,
        "groups": [
            {
                "chatId": str(chat_id),
                "title": group_meta.get(chat_id, (None, None))[0],
                "kind": group_meta.get(chat_id, (None, None))[1],
                "ads": c["ads"],
                "driver": c["driver"],
                "passenger": c["passenger"],
                "calls": c["calls"],
            }
            for chat_id, c in top_groups
        ],
        "groupsTotal": len(groups),
        "topAuthors": top_authors,
        "routed": dict(routed_status),
        "botUsers": {
            "total": users_total,
            "drivers": users_drivers,
            "clients": users_total - users_drivers,
            "blocked": users_blocked,
            "new": users_new,
            "active": users_active,
            "series": [
                {"date": (series_start_local + timedelta(days=i)).strftime("%Y-%m-%d"), "count": new_by_day[(series_start_local + timedelta(days=i)).strftime("%Y-%m-%d")]}
                for i in range(series_days)
            ],
        },
    }
