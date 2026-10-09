import logging
import math
from datetime import datetime

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import FSInputFile
from aiogram.utils.keyboard import InlineKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.base import session_scope
from app.db.models import BotUser
from app.i18n.translations import t
from app.keyboards.trip import nudge_kb
from app.scheduler import activity_tracker
from app.services import bot_config
from app.services import drivers as drivers_service
from app.services import formatted_ads as formatted_ads_service
from app.services import group_ads as group_ads_service
from app.services import groups as groups_service
from app.services import trips as trips_service
from app.services import users as users_service
from app.tts.engine import synth


async def _inactivity_job(bot: Bot) -> None:
    stale = activity_tracker.stale_entries(bot_config.get("inactivity_nudge_seconds"))
    for telegram_id, lang in stale:
        activity_tracker.mark_nudged(telegram_id)
        try:
            await bot.send_message(telegram_id, t("inactivity_nudge_text", lang), reply_markup=nudge_kb(lang))
            path = await synth(t("inactivity_nudge_voice", lang), lang)
            await bot.send_audio(telegram_id, FSInputFile(path))
        except TelegramAPIError:
            continue


async def _freshness_job(bot: Bot) -> None:
    async with session_scope() as session:
        await trips_service.refresh_dispatch_labels(bot, session)


async def _women_first_job(bot: Bot) -> None:
    async with session_scope() as session:
        for order in await trips_service.open_expired_women_orders(bot, session):
            client = await session.get(BotUser, order.bot_user_id)
            if client is None:
                continue
            try:
                await bot.send_message(client.telegram_id, t("order_women_opened_client", client.language))
            except TelegramAPIError:
                pass


async def _kick_from_closed_group(bot: Bot, session, driver) -> None:
    group = await groups_service.get_closed_group_for_driver(session, driver)
    if group is None:
        return
    try:
        await bot.ban_chat_member(group.chat_id, driver.bot_user.telegram_id)
        await bot.unban_chat_member(group.chat_id, driver.bot_user.telegram_id)
    except TelegramAPIError:
        pass


def _admin_contact_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="👤 Admin", url=bot_config.get("admin_contact_url"))
    return builder.as_markup()


async def _subscription_job(bot: Bot) -> None:
    async with session_scope() as session:
        for subscription in await drivers_service.expiring_soon(session, bot_config.get("subscription_reminder_days")):
            driver = subscription.driver
            # Rounded up: the job runs every few hours, so "4.8 days left" should still read 5.
            days_left = max(math.ceil((subscription.expires_at - datetime.utcnow()).total_seconds() / 86400), 1)
            try:
                await bot.send_message(
                    driver.bot_user.telegram_id,
                    t("driver_subscription_expiring", driver.language, days=days_left),
                    reply_markup=_admin_contact_kb(),
                )
            except TelegramAPIError:
                pass
            await drivers_service.mark_expiry_notified(session, subscription)

        for subscription in await drivers_service.expired(session):
            driver = subscription.driver
            await drivers_service.deactivate(session, subscription)
            try:
                await bot.send_message(
                    driver.bot_user.telegram_id,
                    t("driver_subscription_expired", driver.language),
                    reply_markup=_admin_contact_kb(),
                )
            except TelegramAPIError:
                pass
            await _kick_from_closed_group(bot, session, driver)


async def _claim_timeout_job(bot: Bot) -> None:
    async with session_scope() as session:
        released = await trips_service.release_stale_claims(session, bot_config.get("claim_timeout_minutes"))
        if not released:
            return

        admins = None  # fetched lazily, only if some driver actually crosses the threshold

        for order, flaked_driver_id in released:
            client = await session.get(BotUser, order.bot_user_id)
            if client is not None:
                try:
                    await bot.send_message(client.telegram_id, t("order_reclaim_search", client.language))
                except TelegramAPIError:
                    pass

            await trips_service.dispatch_order(bot, session, order, exclude_driver_ids={flaked_driver_id})

            driver = await drivers_service.get(session, flaked_driver_id)
            if driver is not None and driver.no_show_count >= bot_config.get("driver_no_show_alert_threshold"):
                if admins is None:
                    admins = await users_service.list_admins(session)
                warning = (
                    f"⚠️ Haydovchi #{driver.id} ({driver.full_name}, {driver.phone}) "
                    f"{driver.no_show_count} marta buyurtmaga javob bermadi."
                )
                for admin in admins:
                    try:
                        await bot.send_message(admin.telegram_id, warning)
                    except TelegramAPIError:
                        continue


async def _group_ads_cleanup_job(bot: Bot) -> None:
    async with session_scope() as session:
        await group_ads_service.cleanup(bot, session)


async def _formatted_ads_relabel_job(bot: Bot) -> None:
    async with session_scope() as session:
        await formatted_ads_service.relabel(bot, session)


async def _refresh_card_buttons_job(bot: Bot) -> None:
    async with session_scope() as session:
        formatted = await formatted_ads_service.refresh_buttons(bot, session)
        cards = await group_ads_service.refresh_buttons(bot, session)
    logging.getLogger(__name__).info("refreshed buttons on %s formatted ads and %s driver-group cards", formatted, cards)


def setup_scheduler(bot: Bot) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_inactivity_job, "interval", seconds=15, args=[bot], id="inactivity_nudge")
    scheduler.add_job(_freshness_job, "interval", minutes=2, args=[bot], id="order_freshness")
    scheduler.add_job(_subscription_job, "interval", hours=6, args=[bot], id="driver_subscriptions")
    scheduler.add_job(_claim_timeout_job, "interval", minutes=1, args=[bot], id="claim_timeout")
    scheduler.add_job(_women_first_job, "interval", seconds=30, args=[bot], id="women_first")
    scheduler.add_job(_group_ads_cleanup_job, "interval", minutes=1, args=[bot], id="group_ads_cleanup")
    scheduler.add_job(_formatted_ads_relabel_job, "interval", minutes=1, args=[bot], id="formatted_ads_relabel")
    # Once, right after start: cards posted by the previous version get the current buttons.
    scheduler.add_job(_refresh_card_buttons_job, "date", args=[bot], id="refresh_card_buttons")
    return scheduler
