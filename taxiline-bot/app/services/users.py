from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AdminGrant, BotUser


async def get_by_telegram_id(session: AsyncSession, telegram_id: int) -> BotUser | None:
    result = await session.execute(select(BotUser).where(BotUser.telegram_id == telegram_id))
    return result.scalar_one_or_none()


async def list_admins(session: AsyncSession) -> list[BotUser]:
    result = await session.execute(select(BotUser).where(BotUser.is_admin.is_(True)))
    return list(result.scalars())


async def search(session: AsyncSession, query: str, limit: int = 10) -> list[BotUser]:
    """Matches phone/name/username by substring, plus an exact telegram_id match if the query
    is numeric — covers every way an admin is likely to identify a client."""
    like = f"%{query}%"
    conditions = [BotUser.phone.ilike(like), BotUser.name.ilike(like), BotUser.username.ilike(like)]
    if query.isdigit():
        conditions.append(BotUser.telegram_id == int(query))
    result = await session.execute(select(BotUser).where(or_(*conditions)).limit(limit))
    return list(result.scalars())


async def _has_pending_admin_grant(session: AsyncSession, telegram_id: int) -> bool:
    result = await session.execute(select(AdminGrant).where(AdminGrant.telegram_id == telegram_id))
    return result.scalar_one_or_none() is not None


async def create(
    session: AsyncSession,
    *,
    telegram_id: int,
    phone: str,
    name: str | None,
    username: str | None,
    language: str,
    core_user_id: str | None,
) -> BotUser:
    is_admin = telegram_id in settings.super_admin_ids or await _has_pending_admin_grant(session, telegram_id)
    user = BotUser(
        telegram_id=telegram_id,
        phone=phone,
        name=name,
        username=username,
        language=language,
        core_user_id=core_user_id,
        is_admin=is_admin,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def upsert_from_telegram(
    session: AsyncSession,
    *,
    telegram_id: int,
    phone: str,
    name: str | None,
    username: str | None,
    language: str,
    core_user_id: str | None,
) -> BotUser:
    """Used by both first-time registration and post-logout re-login — a BotUser row may
    already exist (just `logged_out=True`) for this telegram_id, in which case it's revived
    in place rather than violating the unique telegram_id constraint with a second insert."""
    existing = await get_by_telegram_id(session, telegram_id)
    if existing:
        existing.phone = phone
        existing.name = name or existing.name
        existing.username = username or existing.username
        existing.language = language
        existing.core_user_id = core_user_id or existing.core_user_id
        existing.logged_out = False
        await session.commit()
        return existing

    return await create(
        session,
        telegram_id=telegram_id,
        phone=phone,
        name=name,
        username=username,
        language=language,
        core_user_id=core_user_id,
    )


async def update_language(session: AsyncSession, user: BotUser, language: str) -> None:
    user.language = language
    await session.commit()


async def update_address(session: AsyncSession, user: BotUser, address: str) -> None:
    user.address = address
    await session.commit()


async def update_name(session: AsyncSession, user: BotUser, name: str) -> None:
    user.name = name
    await session.commit()


async def update_phone(session: AsyncSession, user: BotUser, phone: str) -> None:
    user.phone = phone
    await session.commit()


async def increment_trips(session: AsyncSession, user: BotUser) -> None:
    user.trips_count += 1
    await session.commit()


async def touch_last_seen(session: AsyncSession, user: BotUser) -> None:
    # Naive UTC, matching the "timestamp without time zone" columns everywhere in this schema.
    user.last_seen_at = datetime.utcnow()
    await session.commit()


async def set_blocked(session: AsyncSession, user: BotUser, blocked: bool) -> None:
    user.blocked = blocked
    await session.commit()


async def log_out(session: AsyncSession, user: BotUser) -> None:
    user.logged_out = True
    await session.commit()


async def grant_admin_by_telegram_id(session: AsyncSession, telegram_id: int, granted_by_telegram_id: int) -> str:
    """Promotes `telegram_id` to admin. If they've already registered, this takes effect
    immediately; otherwise it's recorded so `create()` picks it up the moment they /start the
    bot. Returns "already_admin" | "promoted" | "pending" for the caller to report back."""
    existing = await get_by_telegram_id(session, telegram_id)
    if existing is not None:
        if existing.is_admin:
            return "already_admin"
        existing.is_admin = True
        await session.commit()
        return "promoted"

    if await _has_pending_admin_grant(session, telegram_id):
        return "pending"

    session.add(AdminGrant(telegram_id=telegram_id, granted_by_telegram_id=granted_by_telegram_id))
    await session.commit()
    return "pending"
