from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from app.i18n.translations import t
from app.services import users as users_service

# How stale last_seen_at may get before an interaction refreshes it — keeps "active users"
# statistics accurate without a DB write on every single update.
LAST_SEEN_REFRESH = timedelta(minutes=10)


class UserContextMiddleware(BaseMiddleware):
    """Attaches `bot_user` (or None) and `lang` to every handler's data, and stops a blocked
    user's private-chat interactions (blocked users can still be seen/handled by the group
    guard middleware, which applies its own posting rules)."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        session = data.get("session")
        tg_user = getattr(event, "from_user", None)

        bot_user = None
        if session is not None and tg_user is not None and not tg_user.is_bot:
            bot_user = await users_service.get_by_telegram_id(session, tg_user.id)

        if bot_user is not None and abs(datetime.utcnow() - bot_user.last_seen_at) > LAST_SEEN_REFRESH:
            await users_service.touch_last_seen(session, bot_user)

        data["bot_user"] = bot_user
        data["lang"] = bot_user.language if bot_user else "uz"

        chat_type = None
        if isinstance(event, Message):
            chat_type = event.chat.type
        elif isinstance(event, CallbackQuery) and event.message:
            chat_type = event.message.chat.type

        if bot_user and bot_user.blocked and chat_type == "private":
            lang = data["lang"]
            if isinstance(event, Message):
                await event.answer(t("blocked_message", lang))
            elif isinstance(event, CallbackQuery):
                await event.answer(t("blocked_message", lang), show_alert=True)
            return None

        return await handler(event, data)
