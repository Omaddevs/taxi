"""What happens to the driver once their application is reviewed — shared by the Telegram admin
buttons (handlers/admin/drivers.py) and the admin-panel webhook (webserver.py
/webapp/driver-reviewed), so a review from either side lands the driver in the same place."""

import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import FSInputFile

from app.db.models import DriverProfile
from app.handlers.start import send_menu_to
from app.i18n.translations import t
from app.services import groups as groups_service
from app.tts.engine import synth

logger = logging.getLogger(__name__)


async def welcome_approved_driver(bot: Bot, session, driver: DriverProfile) -> str | None:
    """DMs the approval (text + voice), switches the driver to the driver menu right away and
    sends the closed-group invite. Returns a warning for the admin if the invite link couldn't
    be created, else None. Every step is best-effort: the approval itself is already saved."""
    telegram_id = driver.bot_user.telegram_id
    lang = driver.language

    try:
        await bot.send_message(telegram_id, t("driver_approved_dm", lang))
        path = await synth(t("driver_approved_dm", lang), lang)
        await bot.send_audio(telegram_id, FSInputFile(path))
    except Exception:
        logger.warning("approval DM failed for telegram_id=%s", telegram_id)

    # Switch them to the driver-oriented menu immediately, not just on their next /start.
    try:
        await send_menu_to(bot, telegram_id, session, driver.bot_user, lang)
    except TelegramAPIError:
        pass

    group = await groups_service.get_closed_group_for_driver(session, driver)
    if group is None:
        try:
            await bot.send_message(telegram_id, t("driver_group_invite_missing", lang))
        except TelegramAPIError:
            pass
        return None

    try:
        invite = await bot.create_chat_invite_link(group.chat_id, name=f"driver-{driver.id}", creates_join_request=True)
        await bot.send_message(telegram_id, t("driver_group_invite_message", lang, link=invite.invite_link))
    except TelegramAPIError:
        return (
            "⚠️ Guruh havolasini yaratib bo'lmadi — botning guruhda 'foydalanuvchi qo'shish' huquqi "
            "borligini tekshiring."
        )
    return None


async def notify_rejected_driver(bot: Bot, telegram_id: int, lang: str, reason: str) -> None:
    try:
        await bot.send_message(telegram_id, t("driver_rejected_dm", lang, reason=reason))
    except TelegramAPIError:
        pass
