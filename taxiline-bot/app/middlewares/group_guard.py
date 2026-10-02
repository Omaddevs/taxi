from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message, TelegramObject

from app.handlers.admin.group_invites import send_invite_gate
from app.services import groups as groups_service

SPAM_MARKERS = ("http://", "https://", "t.me/", "@")


class GroupGuardMiddleware(BaseMiddleware):
    """Enforces the per-group toggles admins set from the admin panel: join/leave message
    deletion, naive link/mention anti-spam, a 1-message-per-minute rate limit, and — in closed
    driver groups — restricting free-text posting to chat admins (anything else gets deleted
    and reposted as a normalized card so the group stays readable)."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if not isinstance(event, Message) or event.chat.type not in ("group", "supergroup"):
            return await handler(event, data)

        session = data["session"]
        bot = data["bot"]
        group = await groups_service.get_by_chat_id(session, event.chat.id)

        if event.new_chat_members or event.left_chat_member:
            if group and group.settings.get("delete_join_leave"):
                await _try_delete(bot, event)
                return None
            return await handler(event, data)

        if not group or event.from_user is None:
            return await handler(event, data)

        member = await bot.get_chat_member(event.chat.id, event.from_user.id)
        is_chat_admin = member.status in ("administrator", "creator")

        if is_chat_admin:
            return await handler(event, data)

        if group.settings.get("require_invites") and not await groups_service.has_met_invite_requirement(
            session, group.id, event.from_user.id
        ):
            await _try_delete(bot, event)
            await send_invite_gate(bot, session, event.chat.id, group.id, event.from_user.id)
            return None

        if group.kind == "CLOSED" and group.settings.get("restrict_non_admin_posts"):
            await _try_delete(bot, event)
            await _repost_as_card(bot, event, data.get("bot_user"))
            return None

        if group.kind == "MAIN":
            if group.settings.get("anti_spam"):
                text = event.text or event.caption or ""
                if any(marker in text for marker in SPAM_MARKERS):
                    await _try_delete(bot, event)
                    return None

            if group.settings.get("rate_limit_enabled"):
                if not groups_service.check_rate_limit(event.chat.id, event.from_user.id):
                    await _try_delete(bot, event)
                    return None

        return await handler(event, data)


async def _try_delete(bot, event: Message) -> None:
    try:
        await bot.delete_message(event.chat.id, event.message_id)
    except TelegramBadRequest:
        pass


async def _repost_as_card(bot, event: Message, bot_user) -> None:
    contact = f"@{event.from_user.username}" if event.from_user.username else f"id:{event.from_user.id}"
    name = bot_user.name if bot_user and bot_user.name else event.from_user.full_name
    body = event.text or event.caption or "[media]"
    await bot.send_message(
        event.chat.id,
        f"👤 {name} ({contact})\n📥 Guruh orqali keldi:\n\n{body}",
    )
