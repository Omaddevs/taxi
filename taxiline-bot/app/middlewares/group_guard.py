import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramRetryAfter
from aiogram.types import Message, TelegramObject

from app.handlers.admin.group_invites import send_invite_gate
from app.services import group_ads as group_ads_service
from app.services import groups as groups_service
from app.services.ad_format import card_keyboard, parse_ad, render_card

logger = logging.getLogger(__name__)

SPAM_MARKERS = ("http://", "https://", "t.me/", "@")


class GroupGuardMiddleware(BaseMiddleware):
    """Enforces the per-group toggles admins set from the admin panel: join/leave message
    deletion, naive link/mention anti-spam, a 1-message-per-minute rate limit, and — in closed
    driver groups — restricting free-text posting to chat admins (anything else gets deleted
    and reposted as a normalized card so the group stays readable). With `ad_router` on, every
    member's message is taken over by the passenger/driver question (services/group_ads.py);
    with `format_ads` on, a member's taxi ad is replaced by the uniform TaxiLine ad card."""

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

        # Anonymous admins post as the group itself (from_user is the GroupAnonymousBot) and the
        # linked channel's posts arrive as automatic forwards — both are admin traffic. Someone
        # posting as their own channel is not, and has no member record to look up.
        if event.sender_chat is not None:
            is_chat_admin = event.sender_chat.id == event.chat.id or bool(event.is_automatic_forward)
        else:
            try:
                member = await bot.get_chat_member(event.chat.id, event.from_user.id)
                is_chat_admin = member.status in ("administrator", "creator")
            except TelegramBadRequest:
                is_chat_admin = False

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

        if group.settings.get("ad_router") and await group_ads_service.intercept(
            bot, session, group, event, data.get("bot_user")
        ):
            return None

        if group.settings.get("format_ads") and await _repost_as_ad_card(bot, event, data.get("bot_user")):
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


async def _repost_as_ad_card(bot, event: Message, bot_user) -> bool:
    """Reposts a recognisable taxi ad as the uniform card and deletes the original. Returns
    False — original untouched — for non-ads (no route found), media other than a photo,
    posts made as a channel, or when sending the card fails."""
    raw = event.text or (event.caption if event.photo else None)
    if not raw or event.sender_chat is not None:
        return False
    ad = parse_ad(raw)
    if ad is None:
        return False

    author = event.from_user
    name = bot_user.name if bot_user and bot_user.name else author.full_name
    text = render_card(ad, author, name)
    thread_id = event.message_thread_id if event.is_topic_message else None

    async def send(with_chat_button: bool):
        markup = card_keyboard(ad, author, with_chat_button=with_chat_button)
        if event.photo:
            return await bot.send_photo(
                event.chat.id, event.photo[-1].file_id, caption=text, parse_mode="HTML",
                reply_markup=markup, message_thread_id=thread_id,
            )
        return await bot.send_message(
            event.chat.id, text, parse_mode="HTML", reply_markup=markup,
            message_thread_id=thread_id, disable_web_page_preview=True,
        )

    with_chat_button = True
    for _ in range(3):
        try:
            await send(with_chat_button)
            break
        except TelegramRetryAfter as exc:
            # A busy group hits Telegram's ~20 msgs/min per-chat bot limit; wait it out once or twice.
            await asyncio.sleep(exc.retry_after)
        except TelegramBadRequest as exc:
            # A tg://user?id= button is refused when the author's privacy settings hide their
            # profile from the bot — drop just that button and keep the card.
            if with_chat_button and "PRIVACY" in str(exc).upper():
                with_chat_button = False
                continue
            logger.warning("ad card repost failed in %s: %s", event.chat.id, exc)
            return False
        except TelegramAPIError as exc:
            logger.warning("ad card repost failed in %s: %s", event.chat.id, exc)
            return False
    else:
        return False

    await _try_delete(bot, event)
    return True
