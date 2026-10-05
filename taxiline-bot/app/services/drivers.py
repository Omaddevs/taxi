import re
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.models import BotUser, DriverProfile, DriverSubscription
from app.services import groups as groups_service
from app.services.phone import format_phone

_PLATE_STRIP_RE = re.compile(r"[\s\-.]")


def normalize_plate(raw: str) -> str:
    """"e091gb" / "E 091 GB" / "e-091-gb" -> "E091GB" — so a driver's own entry and an admin's
    later search always agree regardless of how either typed it."""
    return _PLATE_STRIP_RE.sub("", raw).upper()


async def get_by_bot_user(session: AsyncSession, bot_user_id: int) -> DriverProfile | None:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.subscription))
        .where(DriverProfile.bot_user_id == bot_user_id)
    )
    return result.scalar_one_or_none()


async def create_application(
    session: AsyncSession,
    bot_user: BotUser,
    *,
    full_name: str,
    phone: str,
    car_model: str,
    plate: str,
    region: str,
    to_region: str | None = None,
) -> DriverProfile:
    # bot_users.id is unique on driver_profiles, so a driver re-applying after a rejection
    # reuses their old row instead of inserting a second one.
    driver = await get_by_bot_user(session, bot_user.id)
    if driver is None:
        driver = DriverProfile(bot_user_id=bot_user.id)
        session.add(driver)
    driver.full_name = full_name
    driver.phone = phone
    driver.car_model = car_model
    driver.plate = normalize_plate(plate)
    driver.region = region
    driver.to_region = to_region
    driver.language = bot_user.language
    driver.status = "PENDING"
    driver.rejection_reason = None
    bot_user.role = "DRIVER"
    await session.commit()
    await session.refresh(driver)
    return driver


async def list_pending(session: AsyncSession) -> list[DriverProfile]:
    result = await session.execute(
        select(DriverProfile).options(selectinload(DriverProfile.bot_user)).where(DriverProfile.status == "PENDING")
    )
    return list(result.scalars())


async def list_by_region(session: AsyncSession, region: str) -> list[DriverProfile]:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.region == region, DriverProfile.status == "APPROVED")
    )
    return list(result.scalars())


async def list_by_status(session: AsyncSession, status: str, *, blocked: bool | None = None) -> list[DriverProfile]:
    """Across every region — used by the admin panel's Tasdiqlangan/Tasdiqlanmagan browser,
    unlike list_by_region which is scoped to dispatch matching for one region."""
    conditions = [DriverProfile.status == status]
    if blocked is not None:
        conditions.append(DriverProfile.blocked.is_(blocked))
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(*conditions)
        .order_by(DriverProfile.id)
    )
    return list(result.scalars())


async def list_blocked(session: AsyncSession) -> list[DriverProfile]:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.blocked.is_(True))
        .order_by(DriverProfile.id)
    )
    return list(result.scalars())


async def update_region(session: AsyncSession, driver: DriverProfile, region: str) -> None:
    driver.region = region
    await session.commit()


async def update_to_region(session: AsyncSession, driver: DriverProfile, to_region: str) -> None:
    driver.to_region = to_region
    await session.commit()


async def update_full_name(session: AsyncSession, driver: DriverProfile, full_name: str) -> None:
    driver.full_name = full_name
    await session.commit()


async def update_phone(session: AsyncSession, driver: DriverProfile, phone: str) -> None:
    driver.phone = phone
    await session.commit()


async def update_car_model(session: AsyncSession, driver: DriverProfile, car_model: str) -> None:
    driver.car_model = car_model
    await session.commit()


async def update_plate(session: AsyncSession, driver: DriverProfile, plate: str) -> None:
    driver.plate = normalize_plate(plate)
    await session.commit()


_STATUS_LABELS = {"PENDING": "⏳ kutilmoqda", "APPROVED": "✅ tasdiqlangan", "REJECTED": "❌ rad etilgan"}


async def render_driver_card(session: AsyncSession, driver: DriverProfile) -> str:
    """Shared by the admin driver browser and the 📋 Obunalar search — one canonical rendering
    so the two views can never drift apart on what info a driver's card shows."""
    route = f"{driver.region} → {driver.to_region}" if driver.to_region else driver.region
    joined = driver.joined_group_at.strftime("%Y-%m-%d") if driver.joined_group_at else "guruhga hali qo'shilmagan"

    group = await groups_service.get_closed_group_for_driver(session, driver)
    group_line = f"Guruh: {group.title or group.chat_id}" if group else "Guruh: biriktirilmagan"

    sub_line = "Obuna: yo'q"
    if driver.subscription:
        days_left = max((driver.subscription.expires_at - datetime.utcnow()).days, 0)
        state = "faol" if driver.subscription.active else "bekor qilingan"
        sub_line = f"Obuna: {state}, {days_left} kun qoldi (tugash: {driver.subscription.expires_at:%Y-%m-%d})"

    status_line = _STATUS_LABELS.get(driver.status, driver.status)
    if driver.blocked:
        status_line += " · 🚫 BLOKLANGAN"

    return (
        f"🚗 #{driver.id} {driver.full_name} — {format_phone(driver.phone)}\n"
        f"🚙 {driver.car_model} · {driver.plate}\n"
        f"📍 {route}\n"
        f"{group_line}\n"
        f"Holati: {status_line}\n"
        f"Qo'shilgan: {joined}\n"
        f"{sub_line}\n"
        f"Javobsiz qoldirgan: {driver.no_show_count}"
    )


async def get(session: AsyncSession, driver_id: int) -> DriverProfile | None:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.id == driver_id)
    )
    return result.scalar_one_or_none()


async def find_by_plate(session: AsyncSession, plate: str) -> DriverProfile | None:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.plate == normalize_plate(plate))
    )
    return result.scalar_one_or_none()


async def find_by_phone(session: AsyncSession, phone: str) -> DriverProfile | None:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.phone == phone)
    )
    return result.scalar_one_or_none()


async def approve_application(session: AsyncSession, driver: DriverProfile) -> None:
    """Marks the application approved and starts the 1-month subscription from the approval
    day (the expiry reminder goes out `subscription_reminder_days` before it ends)."""
    driver.status = "APPROVED"
    driver.approved_at = datetime.utcnow()
    await session.commit()
    await ensure_subscription(session, driver)


async def ensure_subscription(session: AsyncSession, driver: DriverProfile) -> DriverSubscription:
    """Starts the subscription unless one is already running — joining the closed group after
    approval must not push the end date further out."""
    subscription = await _get_subscription(session, driver.id)
    if subscription is not None and subscription.active and subscription.expires_at > datetime.utcnow():
        return subscription
    return await start_subscription(session, driver)


async def _get_subscription(session: AsyncSession, driver_id: int) -> DriverSubscription | None:
    result = await session.execute(select(DriverSubscription).where(DriverSubscription.driver_profile_id == driver_id))
    return result.scalar_one_or_none()


async def start_subscription(session: AsyncSession, driver: DriverProfile) -> DriverSubscription:
    """Starts (or restarts) the 30-day subscription clock from now. Called on approval (via
    `ensure_subscription`) and by an admin's manual "Obunani yangilash".

    Takes the `driver` object (not just its id) so that when a subscription is created for the
    first time, the new row can be attached to `driver.subscription` directly — otherwise the
    already-loaded relationship on any identity-mapped DriverProfile object elsewhere in this
    session stays stale at `None` even after the row exists in the DB, since SQLAlchemy only
    re-populates an eager-loaded relationship on refresh/expiry, not on a bare `session.add()`
    of the related row."""
    subscription = await _get_subscription(session, driver.id)
    now = datetime.utcnow()
    expires_at = now + timedelta(days=settings.driver_subscription_days)
    if subscription is None:
        subscription = DriverSubscription(driver_profile_id=driver.id, expires_at=expires_at, active=True)
        session.add(subscription)
        driver.subscription = subscription
    else:
        subscription.started_at = now
        subscription.expires_at = expires_at
        subscription.active = True
        subscription.expiry_notified_at = None
    await session.commit()
    return subscription


async def renew_subscription(session: AsyncSession, driver: DriverProfile) -> DriverSubscription:
    return await start_subscription(session, driver)


async def cancel_subscription(session: AsyncSession, driver: DriverProfile) -> None:
    subscription = await _get_subscription(session, driver.id)
    if subscription is not None:
        subscription.active = False
        await session.commit()


async def reject(session: AsyncSession, driver: DriverProfile, reason: str) -> None:
    driver.status = "REJECTED"
    driver.rejection_reason = reason
    await session.commit()


async def set_blocked(session: AsyncSession, driver: DriverProfile, blocked: bool) -> None:
    driver.blocked = blocked
    await session.commit()


async def mark_joined_group(session: AsyncSession, driver: DriverProfile) -> None:
    driver.joined_group_at = datetime.utcnow()
    await session.commit()


async def expiring_soon(session: AsyncSession, days_threshold: int) -> list[DriverSubscription]:
    cutoff = datetime.utcnow() + timedelta(days=days_threshold)
    result = await session.execute(
        select(DriverSubscription)
        .options(selectinload(DriverSubscription.driver).selectinload(DriverProfile.bot_user))
        .where(
            DriverSubscription.active.is_(True),
            DriverSubscription.expires_at <= cutoff,
            DriverSubscription.expires_at > datetime.utcnow(),
            DriverSubscription.expiry_notified_at.is_(None),
        )
    )
    return list(result.scalars())


async def expired(session: AsyncSession) -> list[DriverSubscription]:
    result = await session.execute(
        select(DriverSubscription)
        .options(selectinload(DriverSubscription.driver).selectinload(DriverProfile.bot_user))
        .where(DriverSubscription.active.is_(True), DriverSubscription.expires_at <= datetime.utcnow())
    )
    return list(result.scalars())


async def mark_expiry_notified(session: AsyncSession, subscription: DriverSubscription) -> None:
    subscription.expiry_notified_at = datetime.utcnow()
    await session.commit()


async def deactivate(session: AsyncSession, subscription: DriverSubscription) -> None:
    subscription.active = False
    await session.commit()
