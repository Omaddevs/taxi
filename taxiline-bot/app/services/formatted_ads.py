"""The `format_ads` group service: a member's taxi ad is reposted by the bot with the author's
own text left exactly as written — the bot only adds a TaxiLine header with a freshness label
(🟢 Faol → 🟡 30 daqiqa oldin → … → 🔴 Eskirgan), an "E'lon egasi" line, and write/call buttons.

ad_format.parse_ad is still the gate (a message counts as an ad only if a route is recognised)
and supplies the phone for the call button, but none of its parsed fields are printed.
Each repost is stored (formatted_ads) so the scheduler can move its label along as it ages.
"""

import asyncio
import html
import logging
from datetime import datetime, timedelta

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramRetryAfter
from aiogram.types import InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FormattedAd
from app.services import bot_config
from app.services import calls as calls_service
from app.services.ad_format import parse_ad, profile_url

logger = logging.getLogger(__name__)

_TEXT_LIMIT = 4096
_CAPTION_LIMIT = 1024
_DIVIDER = "➖➖➖➖➖➖➖➖➖➖"


def _humanize(minutes: int) -> str:
    hours, mins = divmod(minutes, 60)
    if not hours:
        return f"{mins} daqiqa"
    return f"{hours} soat {mins} daqiqa" if mins else f"{hours} soat"


def status_label(created_at: datetime, now: datetime | None = None) -> tuple[str, bool]:
    """(label, final). The label only changes once per `fresh_minutes` step, so a card is
    edited a handful of times in its life rather than every minute."""
    fresh = bot_config.get("format_ads.fresh_minutes")
    stale = bot_config.get("format_ads.stale_minutes")
    age = int(((now or datetime.utcnow()) - created_at).total_seconds() // 60)
    if age < fresh:
        return "🟢 Faol", False
    if age >= stale:
        return "🔴 Eskirgan", True
    return f"🟡 {_humanize(age // fresh * fresh)} oldin", False


def render(ad: FormattedAd, label: str) -> str:
    subtitle = bot_config.get("format_ads.passenger_subtitle" if ad.is_passenger else "format_ads.driver_subtitle")
    owner = f'<a href="{profile_url(ad.author_telegram_id, ad.author_username)}">{html.escape(ad.author_name)}</a>'
    return "\n".join(
        [
            f"🚕 <b>TAXILINE</b>  ·  {label}",
            f"<i>{html.escape(subtitle, quote=False)}</i>",
            _DIVIDER,
            ad.body_html,
            _DIVIDER,
            f"E'lon egasi: {owner}",
        ]
    )


def keyboard(ad: FormattedAd) -> InlineKeyboardMarkup | None:
    whom = "Yo'lovchiga" if ad.is_passenger else "Haydovchiga"
    builder = InlineKeyboardBuilder()
    if ad.chat_button:
        builder.button(text=f"💬 {whom} yozish", url=profile_url(ad.author_telegram_id, ad.author_username))
    if ad.phone:
        builder.button(**calls_service.button(f"📞 {whom} tel qilish", calls_service.FORMATTED, ad.id, ad.phone))
    builder.adjust(1)
    markup = builder.as_markup()
    return markup if markup.inline_keyboard else None


async def _send(bot: Bot, event: Message, ad: FormattedAd, text: str) -> Message:
    thread_id = event.message_thread_id if event.is_topic_message else None
    if ad.has_photo:
        return await bot.send_photo(
            event.chat.id, event.photo[-1].file_id, caption=text, parse_mode="HTML",
            reply_markup=keyboard(ad), message_thread_id=thread_id,
        )
    return await bot.send_message(
        event.chat.id, text, parse_mode="HTML", reply_markup=keyboard(ad),
        message_thread_id=thread_id, disable_web_page_preview=True,
    )


async def repost(bot: Bot, session: AsyncSession, event: Message, bot_user) -> bool:
    """Reposts a recognisable taxi ad with the TaxiLine header and deletes the original.
    False — original untouched — for non-ads, media other than a photo, posts made as a
    channel, text too long to fit with the header, or when sending fails."""
    raw = event.text or (event.caption if event.photo else None)
    if not raw or event.sender_chat is not None or event.from_user is None:
        return False
    parsed = parse_ad(raw)
    if parsed is None:
        return False

    author = event.from_user
    ad = FormattedAd(
        chat_id=event.chat.id,
        author_telegram_id=author.id,
        author_name=bot_user.name if bot_user and bot_user.name else author.full_name,
        author_username=author.username,
        # The author's own formatting (bold, links, emoji) is kept via html_text.
        body_html=event.html_text,
        is_passenger=parsed.is_passenger,
        phone=parsed.phones[0] if parsed.phones else None,
        has_photo=bool(event.photo),
        chat_button=True,
        created_at=datetime.utcnow(),
        label="🟢 Faol",
    )
    limit = _CAPTION_LIMIT if ad.has_photo else _TEXT_LIMIT
    # The id goes into the call button's link, so the row exists before the send.
    session.add(ad)
    await session.flush()

    async def give_up() -> bool:
        await session.delete(ad)
        await session.commit()
        return False

    plain_fallback = False
    for _ in range(4):
        text = render(ad, ad.label)
        if len(text) > limit:
            return await give_up()  # leave a very long ad as the author posted it
        try:
            message = await _send(bot, event, ad, text)
            break
        except TelegramRetryAfter as exc:
            # A busy group hits Telegram's ~20 msgs/min per-chat bot limit; wait it out.
            await asyncio.sleep(exc.retry_after)
        except TelegramBadRequest as exc:
            reason = str(exc).upper()
            # A tg://user?id= button is refused when the author's privacy settings hide them.
            if ad.chat_button and "PRIVACY" in reason:
                ad.chat_button = False
                continue
            if calls_service.is_login_url_error(exc):
                calls_service.disable_login_url()
                continue
            # Entities the bot may not resend (e.g. premium custom emoji) — fall back to plain text.
            if not plain_fallback:
                plain_fallback = True
                ad.body_html = html.escape(raw)
                continue
            logger.warning("format_ads repost failed in %s: %s", event.chat.id, exc)
            return await give_up()
        except TelegramAPIError as exc:
            logger.warning("format_ads repost failed in %s: %s", event.chat.id, exc)
            return await give_up()
    else:
        return await give_up()

    ad.message_id = message.message_id
    await session.commit()
    try:
        await bot.delete_message(event.chat.id, event.message_id)
    except TelegramBadRequest:
        pass
    return True


async def relabel(bot: Bot, session: AsyncSession) -> None:
    """Scheduled every minute: moves each live card's label along; a 🔴 card is left alone after."""
    window = timedelta(minutes=bot_config.get("format_ads.stale_minutes") + 60)
    result = await session.execute(
        select(FormattedAd)
        .where(FormattedAd.final.is_(False), FormattedAd.created_at >= datetime.utcnow() - window)
        .order_by(FormattedAd.id)
        .limit(200)
    )
    for ad in result.scalars():
        label, final = status_label(ad.created_at)
        if label == ad.label:
            continue
        text = render(ad, label)
        try:
            if ad.has_photo:
                await bot.edit_message_caption(
                    chat_id=ad.chat_id, message_id=ad.message_id, caption=text, parse_mode="HTML", reply_markup=keyboard(ad)
                )
            else:
                await bot.edit_message_text(
                    text, chat_id=ad.chat_id, message_id=ad.message_id, parse_mode="HTML",
                    reply_markup=keyboard(ad), disable_web_page_preview=True,
                )
        except TelegramRetryAfter as exc:
            await session.commit()
            await asyncio.sleep(min(exc.retry_after, 30))
            return  # the rest wait for the next run
        except TelegramBadRequest as exc:
            if calls_service.is_login_url_error(exc):
                calls_service.disable_login_url()  # next run re-renders with plain links
                continue
            if "not modified" not in str(exc).lower():
                final = True  # deleted by someone, or otherwise uneditable — stop trying
        except TelegramAPIError:
            continue
        ad.label = label
        ad.final = final
    # Anything older than the window can't need another edit.
    stale = await session.execute(
        select(FormattedAd).where(FormattedAd.final.is_(False), FormattedAd.created_at < datetime.utcnow() - window)
    )
    for ad in stale.scalars():
        ad.final = True
    await session.commit()


async def refresh_buttons(bot: Bot, session: AsyncSession) -> int:
    """Run once at startup: re-attaches the current buttons to every live card, so cards posted
    by an older version (e.g. before call logging) get today's call link. Returns cards updated."""
    window = timedelta(minutes=bot_config.get("format_ads.stale_minutes") + 60)
    result = await session.execute(
        select(FormattedAd).where(FormattedAd.final.is_(False), FormattedAd.created_at >= datetime.utcnow() - window)
    )
    updated = 0
    for ad in result.scalars():
        for _ in range(2):
            try:
                await bot.edit_message_reply_markup(chat_id=ad.chat_id, message_id=ad.message_id, reply_markup=keyboard(ad))
                updated += 1
                break
            except TelegramRetryAfter as exc:
                await asyncio.sleep(exc.retry_after)
            except TelegramBadRequest as exc:
                if calls_service.is_login_url_error(exc):
                    calls_service.disable_login_url()
                    continue
                break  # "not modified", or the message is gone
            except TelegramAPIError:
                break
        await asyncio.sleep(0.2)
    return updated
