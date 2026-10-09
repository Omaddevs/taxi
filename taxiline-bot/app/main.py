import asyncio
import logging
from contextlib import suppress

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeAllChatAdministrators, ErrorEvent

from app.config import settings
from app.db.base import session_scope
from app.handlers import cargo_claim, driver_flow, rent, driver_menu, giveaway, group_ads, group_commands, main_menu, order_claim, otp_confirm, profile, rating, settings as settings_handlers, start, support, trip_flow
from app.handlers.admin import admins as admin_admins
from app.handlers.admin import broadcast as admin_broadcast
from app.handlers.admin import complaints as admin_complaints
from app.handlers.admin import drivers as admin_drivers
from app.handlers.admin import group_invites as admin_group_invites
from app.handlers.admin import group_join as admin_group_join
from app.handlers.admin import groups as admin_groups
from app.handlers.admin import panel as admin_panel
from app.handlers.admin import stats as admin_stats
from app.handlers.admin import subscriptions as admin_subscriptions
from app.handlers.admin import support as admin_support
from app.handlers.admin import users as admin_users
from app.i18n.translations import t
from app.middlewares.db_session import DbSessionMiddleware
from app.middlewares.group_guard import GroupGuardMiddleware
from app.middlewares.mandatory_sub import MandatorySubMiddleware
from app.middlewares.user_context import UserContextMiddleware
from app.scheduler.jobs import setup_scheduler
from app.services import bot_config
from app.services.backend_client import backend_client
from app.webserver import run_webserver

logging.basicConfig(level=logging.INFO)


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())

    for observer in (
        dp.message,
        dp.callback_query,
        dp.my_chat_member,
        dp.chat_join_request,
        dp.chat_member,
        dp.inline_query,
    ):
        observer.outer_middleware(DbSessionMiddleware())
        observer.outer_middleware(UserContextMiddleware())

    dp.message.outer_middleware(MandatorySubMiddleware())
    dp.callback_query.outer_middleware(MandatorySubMiddleware())
    dp.message.outer_middleware(GroupGuardMiddleware())

    # Client-facing flows first, then admin panel — none of their filters overlap (unique
    # button texts, unique callback_data prefixes, mutually exclusive FSM states), so order
    # only matters for readability here, not correctness.
    dp.include_routers(
        group_commands.router,
        # Before start.router: its /start gad_<id> deep link must win over the generic /start.
        group_ads.router,
        start.router,
        giveaway.router,
        trip_flow.router,
        rent.router,
        order_claim.router,
        cargo_claim.router,
        otp_confirm.router,
        driver_flow.router,
        driver_menu.router,
        rating.router,
        profile.router,
        settings_handlers.router,
        support.router,
        main_menu.router,
        admin_panel.router,
        admin_groups.router,
        admin_drivers.router,
        admin_users.router,
        admin_broadcast.router,
        admin_complaints.router,
        admin_support.router,
        admin_stats.router,
        admin_admins.router,
        admin_subscriptions.router,
        admin_group_join.router,
        admin_group_invites.router,
    )

    # Without this, any unhandled exception (e.g. server/ returning 500) leaves the user with
    # no reply at all and the bot looks frozen.
    @dp.errors()
    async def on_error(event: ErrorEvent) -> bool:
        logging.getLogger(__name__).exception("Unhandled error", exc_info=event.exception)
        update = event.update
        target = update.message or (update.callback_query and update.callback_query.message)
        user = (update.message and update.message.from_user) or (
            update.callback_query and update.callback_query.from_user
        )
        if update.callback_query:
            with suppress(Exception):
                await update.callback_query.answer()
        if target and target.chat.type == "private":
            lang = user.language_code if user and user.language_code in ("uz", "ru", "en") else "uz"
            with suppress(Exception):
                await target.answer(t("service_unavailable", lang))
        return True

    return dp


GROUP_ADMIN_COMMANDS = [
    BotCommand(command="guruh", description="Guruh sozlamalari (faqat guruh adminlari)"),
    BotCommand(command="admin", description="Guruh sozlamalari (faqat guruh adminlari)"),
    BotCommand(command="delete", description="Yoqilgan xizmatlarni o'chirish (faqat adminlar)"),
]


async def _register_commands(bot: Bot) -> None:
    # Shown in the "/" menu of group admins only; regular members keep the default list.
    try:
        await bot.set_my_commands(GROUP_ADMIN_COMMANDS, scope=BotCommandScopeAllChatAdministrators())
    except Exception:
        logging.getLogger(__name__).exception("set_my_commands failed")


async def main() -> None:
    # No default parse_mode: most messages interpolate raw user-supplied text (names,
    # complaints, group titles), and a global HTML/Markdown default would make any stray
    # "<", ">", "&", "_" or "*" in that text a "can't parse entities" send failure. The one or
    # two messages that want formatting set parse_mode explicitly on that call.
    bot = Bot(token=settings.bot_token)
    dp = build_dispatcher()
    async with session_scope() as session:
        await bot_config.load(session)
    await _register_commands(bot)

    scheduler = setup_scheduler(bot)
    scheduler.start()

    web_runner = await run_webserver(bot, settings.bot_http_port)

    try:
        await dp.start_polling(bot)
    finally:
        await web_runner.cleanup()
        scheduler.shutdown(wait=False)
        await backend_client.aclose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
