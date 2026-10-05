from aiogram import Router
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatJoinRequest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import DriverProfile
from app.services import drivers as drivers_service
from app.services import groups as groups_service
from app.services.backend_client import backend_client

router = Router(name="group_join")


async def _find_approved_driver_in_region(session, telegram_id: int, region: str) -> DriverProfile | None:
    candidates = await drivers_service.list_by_region(session, region)
    return next((d for d in candidates if d.bot_user.telegram_id == telegram_id), None)


async def _find_any_approved_driver(session, telegram_id: int) -> DriverProfile | None:
    result = await session.execute(
        select(DriverProfile).options(selectinload(DriverProfile.bot_user)).where(DriverProfile.status == "APPROVED")
    )
    return next((d for d in result.scalars() if d.bot_user.telegram_id == telegram_id), None)


@router.chat_join_request()
async def handle_join_request(update: ChatJoinRequest, session) -> None:
    """Auto-approves a join request into a registered CLOSED group only if the requester is
    an APPROVED, non-blocked driver for that group's region (or any approved driver, for a
    catch-all group with no region set) — this is also the moment their DriverSubscription
    actually starts (per "obuna guruhga qo'shilgan kundan boshlanadi"), not when the admin
    taps "Tasdiqlash" on the application."""
    group = await groups_service.get_by_chat_id(session, update.chat.id)
    if group is None or group.kind != "CLOSED":
        return

    if group.region is not None:
        driver = await _find_approved_driver_in_region(session, update.from_user.id, group.region)
    else:
        driver = await _find_any_approved_driver(session, update.from_user.id)

    if driver is None or driver.blocked:
        try:
            await update.bot.decline_chat_join_request(update.chat.id, update.from_user.id)
        except TelegramAPIError:
            pass
        return

    try:
        await update.bot.approve_chat_join_request(update.chat.id, update.from_user.id)
    except TelegramAPIError:
        return

    await drivers_service.mark_joined_group(session, driver)
    # Normally already running since approval; this only starts one for drivers approved
    # before subscriptions began on approval.
    await drivers_service.ensure_subscription(session, driver)
    await backend_client.touch_channel(update.from_user.id, "GROUP")
