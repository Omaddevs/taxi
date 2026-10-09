"""Public-group message routing ("ad_router" group setting).

A non-admin writes in an open group → the bot deletes the message and asks, right there,
"yo'lovchimisiz yoki haydovchi?":

* 🙋 Yo'lovchi — the message becomes a card in the closed driver group linked to this group
  (`settings.linked_group_id`, set from the admin dashboard or the bot's admin panel), with
  "✅ Men olaman" / write / call buttons. The question is edited into "ma'lumotlaringiz
  yuborildi…" with a «Yuborish» button that opens the bot's DM to resend or change the ad.
* 🚖 Haydovchi — nothing is forwarded; the question becomes "adminga murojaat qiling" with an
  «Adminga yozish» button.

The answer is remembered for `group_ads.role_memory_hours`, so a returning passenger's next
ad goes straight to the drivers and a returning driver isn't asked again. Approved drivers
with an active subscription post freely (`group_ads.allow_subscribed_drivers`). The bot's own
messages in the open group delete themselves (see `cleanup`) so 40k-member groups stay clean.
"""

import asyncio
import html
import logging
from datetime import datetime, timedelta

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramRetryAfter
from aiogram.types import InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import BotUser, DriverProfile, Group, GroupAd
from app.services import bot_config
from app.services.ad_format import call_button_kwargs, parse_ad_fields, profile_url
from app.services.phone import format_phone

logger = logging.getLogger(__name__)

PASSENGER = "PASSENGER"
DRIVER = "DRIVER"
# Long ads are quoted in full on the card, up to Telegram's limits (4096 text / 1024 caption).
_QUOTE_LIMIT_TEXT = 1500
_QUOTE_LIMIT_CAPTION = 350


def mention(user_id: int, name: str) -> str:
    return f'<a href="tg://user?id={user_id}">{html.escape(name or "Foydalanuvchi")}</a>'


def _template(key: str, name_html: str) -> str:
    """Admin-edited text is escaped as a whole, so a stray "<" can't break HTML parsing —
    {name} is the only markup that gets in."""
    return html.escape(bot_config.get(key), quote=False).replace("{name}", name_html)


async def _with_retry(factory):
    """Runs a Telegram call, waiting out flood limits (busy groups hit ~20 msgs/min per chat)."""
    for attempt in range(3):
        try:
            return await factory()
        except TelegramRetryAfter as exc:
            if attempt == 2:
                raise
            await asyncio.sleep(exc.retry_after)


async def _delete(bot: Bot, chat_id: int, message_id: int | None) -> None:
    if not message_id:
        return
    try:
        await bot.delete_message(chat_id, message_id)
    except TelegramAPIError:
        pass


async def bot_username(bot: Bot) -> str:
    return (await bot.me()).username


async def linked_group(session: AsyncSession, group: Group) -> Group | None:
    linked_id = (group.settings or {}).get("linked_group_id")
    if not linked_id:
        return None
    return await session.get(Group, int(linked_id))


async def _is_subscribed_driver(session: AsyncSession, telegram_id: int) -> bool:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.subscription))
        .join(BotUser, DriverProfile.bot_user_id == BotUser.id)
        .where(BotUser.telegram_id == telegram_id, DriverProfile.status == "APPROVED", DriverProfile.blocked.is_(False))
    )
    driver = result.scalars().first()
    return bool(driver and driver.subscription is not None and driver.subscription.active)


async def _remembered(session: AsyncSession, chat_id: int, telegram_id: int) -> GroupAd | None:
    hours = bot_config.get("group_ads.role_memory_hours")
    if not hours:
        return None
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    result = await session.execute(
        select(GroupAd)
        .where(
            GroupAd.source_chat_id == chat_id,
            GroupAd.author_telegram_id == telegram_id,
            GroupAd.role.is_not(None),
            GroupAd.answered_at >= cutoff,
        )
        .order_by(GroupAd.answered_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ── keyboards ────────────────────────────────────────────────────────────────────────────


def question_kb(ad_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🙋 Yo'lovchiman", callback_data=f"gad:p:{ad_id}")
    builder.button(text="🚖 Haydovchiman", callback_data=f"gad:d:{ad_id}")
    builder.adjust(2)
    return builder.as_markup()


def passenger_notice_kb(ad_id: int, username: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✏️ Yuborish", url=f"https://t.me/{username}?start=gad_{ad_id}")
    return builder.as_markup()


def driver_notice_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="👨‍💼 Adminga yozish", url=bot_config.get("admin_contact_url"))
    return builder.as_markup()


def card_kb(ad: GroupAd, *, with_chat_button: bool = True) -> InlineKeyboardMarkup:
    parsed = parse_ad_fields(ad.text)
    builder = InlineKeyboardBuilder()
    if ad.status == "SENT":
        builder.button(text="✅ Men olaman", callback_data=f"gad:c:{ad.id}")
    elif ad.status == "TAKEN":
        builder.button(text="↩️ Bo'shatish (faqat olgan haydovchi)", callback_data=f"gad:r:{ad.id}")
    if with_chat_button:
        builder.button(text="💬 Yo'lovchiga yozish", url=profile_url(ad.author_telegram_id, ad.author_username))
    if parsed.phones:
        builder.button(**call_button_kwargs(parsed.phones[0], "📞 Yo'lovchiga tel qilish"))
    builder.adjust(1)
    return builder.as_markup()


# ── the closed-group card ────────────────────────────────────────────────────────────────


def render_card(ad: GroupAd, source_title: str | None, *, edited: bool = False) -> str:
    parsed = parse_ad_fields(ad.text)
    if ad.status == "TAKEN":
        status = f"🔴 Band — {html.escape(ad.taken_by_name or 'haydovchi')} oldi"
    elif ad.status == "CANCELLED":
        status = "⚪️ Yo'lovchi bekor qildi"
    else:
        status = "🟢 Faol"

    lines = [f"🙋 <b>YO'LOVCHI E'LONI</b>  ·  {status}"]
    if edited:
        lines.append("<i>✏️ Yo'lovchi ma'lumotlarini yangiladi</i>")
    lines.append("➖➖➖➖➖➖➖➖➖➖")
    if parsed.origins and parsed.destinations:
        route = f"{' / '.join(parsed.origins)} → {' / '.join(parsed.destinations)}".upper()
        lines.append(f"📍 <b>{html.escape(route)}</b>")
    elif parsed.origins or parsed.destinations:
        lines.append(f"📍 <b>{html.escape(' / '.join(parsed.origins or parsed.destinations).upper())}</b>")
    if parsed.departure:
        lines += ["", "🕐 <b>Jo'nash vaqti</b>", html.escape(parsed.departure)]
    if parsed.seats:
        lines += ["", "👥 <b>Yo'lovchilar</b>", f"{parsed.seats} nafar"]
    if parsed.takes_cargo:
        lines += ["", "📦 <b>Pochta</b> bor"]
    if parsed.phones:
        lines += ["", "📞 <b>Yo'lovchi telefoni</b>", "\n".join(format_phone(p) for p in parsed.phones)]

    limit = _QUOTE_LIMIT_CAPTION if ad.photo_file_id else _QUOTE_LIMIT_TEXT
    quote = ad.text if len(ad.text) <= limit else ad.text[: limit - 1] + "…"
    lines += ["", "📝 <b>Xabar</b>", f"<blockquote>{html.escape(quote)}</blockquote>"]
    lines.append("➖➖➖➖➖➖➖➖➖➖")
    footer = f"👤 {mention(ad.author_telegram_id, ad.author_name)}"
    if source_title:
        footer += f"  ·  📢 {html.escape(source_title)}"
    lines.append(footer)
    return "\n".join(lines)


async def _send_card(bot: Bot, ad: GroupAd, source_title: str | None) -> Message:
    async def send(with_chat_button: bool):
        text = render_card(ad, source_title)
        markup = card_kb(ad, with_chat_button=with_chat_button)
        if ad.photo_file_id:
            return await _with_retry(
                lambda: bot.send_photo(ad.target_chat_id, ad.photo_file_id, caption=text, parse_mode="HTML", reply_markup=markup)
            )
        return await _with_retry(
            lambda: bot.send_message(ad.target_chat_id, text, parse_mode="HTML", reply_markup=markup, disable_web_page_preview=True)
        )

    try:
        return await send(True)
    except TelegramBadRequest as exc:
        # tg://user?id= buttons are refused when the author's privacy settings hide them.
        if "PRIVACY" not in str(exc).upper():
            raise
        return await send(False)


async def refresh_card(bot: Bot, ad: GroupAd, source_title: str | None, *, edited: bool = False) -> bool:
    """Re-renders an existing closed-group card in place. False if the message is gone."""
    if not ad.card_message_id or not ad.target_chat_id:
        return False

    async def edit(with_chat_button: bool):
        text = render_card(ad, source_title, edited=edited)
        markup = card_kb(ad, with_chat_button=with_chat_button)
        if ad.photo_file_id:
            return await bot.edit_message_caption(
                chat_id=ad.target_chat_id, message_id=ad.card_message_id, caption=text, parse_mode="HTML", reply_markup=markup
            )
        return await bot.edit_message_text(
            text, chat_id=ad.target_chat_id, message_id=ad.card_message_id, parse_mode="HTML",
            reply_markup=markup, disable_web_page_preview=True,
        )

    try:
        await edit(True)
    except TelegramBadRequest as exc:
        message = str(exc).lower()
        if "not modified" in message:
            return True
        if "privacy" in message:
            try:
                await edit(False)
                return True
            except TelegramAPIError:
                return False
        return False
    except TelegramAPIError:
        return False
    return True


async def _source_title(session: AsyncSession, chat_id: int) -> str | None:
    result = await session.execute(select(Group.title).where(Group.chat_id == chat_id))
    return result.scalar_one_or_none()


async def send_to_drivers(bot: Bot, session: AsyncSession, ad: GroupAd, target: Group) -> bool:
    ad.target_chat_id = target.chat_id
    ad.status = "SENT"
    try:
        message = await _send_card(bot, ad, await _source_title(session, ad.source_chat_id))
    except TelegramAPIError as exc:
        logger.warning("group ad %s: could not post to closed group %s: %s", ad.id, target.chat_id, exc)
        ad.status = "PENDING"
        await session.commit()
        return False
    ad.card_message_id = message.message_id
    await session.commit()
    return True


# ── the open-group side ──────────────────────────────────────────────────────────────────


async def _post_notice(bot: Bot, event: Message, text: str, markup: InlineKeyboardMarkup) -> Message | None:
    thread_id = event.message_thread_id if event.is_topic_message else None
    try:
        return await _with_retry(
            lambda: bot.send_message(
                event.chat.id, text, parse_mode="HTML", reply_markup=markup,
                message_thread_id=thread_id, disable_web_page_preview=True,
            )
        )
    except TelegramAPIError as exc:
        logger.warning("group ad notice failed in %s: %s", event.chat.id, exc)
        return None


async def _last_driver_notice_at(session: AsyncSession, chat_id: int, telegram_id: int) -> datetime | None:
    result = await session.execute(
        select(GroupAd.answered_at)
        .where(
            GroupAd.source_chat_id == chat_id,
            GroupAd.author_telegram_id == telegram_id,
            GroupAd.role == DRIVER,
            GroupAd.prompt_message_id.is_not(None),
        )
        .order_by(GroupAd.answered_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def intercept(bot: Bot, session: AsyncSession, group: Group, event: Message, bot_user) -> bool:
    """Called by the group guard for a non-admin's message in a group with `ad_router` on.
    True means the message was taken over (deleted/asked/forwarded); False leaves it to the
    normal pipeline — e.g. the group isn't linked to a closed group yet."""
    target = await linked_group(session, group)
    if target is None or event.from_user is None or event.sender_chat is not None:
        return False

    author = event.from_user
    if bot_config.get("group_ads.allow_subscribed_drivers") and await _is_subscribed_driver(session, author.id):
        return False

    text = (event.text or event.caption or "").strip()
    name = bot_user.name if bot_user and bot_user.name else author.full_name
    name_html = mention(author.id, name)

    if not text or text.startswith("/"):
        # Stickers, voice notes, bare media and stray commands carry nothing a driver can use.
        await _delete(bot, event.chat.id, event.message_id)
        return True

    ad = GroupAd(
        source_chat_id=event.chat.id,
        author_telegram_id=author.id,
        author_name=name,
        author_username=author.username,
        text=text,
        photo_file_id=event.photo[-1].file_id if event.photo else None,
    )
    session.add(ad)
    await session.flush()

    remembered = await _remembered(session, event.chat.id, author.id)
    now = datetime.utcnow()

    if remembered is not None and remembered.role == PASSENGER:
        ad.role = PASSENGER
        ad.answered_at = now
        if not await send_to_drivers(bot, session, ad, target):
            await session.delete(ad)
            await session.commit()
            return False
        await _delete(bot, event.chat.id, event.message_id)
        notice = await _post_notice(
            bot, event, _template("group_ads.passenger_text", name_html), passenger_notice_kb(ad.id, await bot_username(bot))
        )
        ad.prompt_message_id = notice.message_id if notice else None
        await session.commit()
        return True

    if remembered is not None and remembered.role == DRIVER:
        ad.role = DRIVER
        ad.status = DRIVER
        ad.answered_at = now
        await _delete(bot, event.chat.id, event.message_id)
        last = await _last_driver_notice_at(session, event.chat.id, author.id)
        cooldown = timedelta(minutes=bot_config.get("group_ads.driver_notice_cooldown_minutes"))
        if last is None or now - last >= cooldown:
            notice = await _post_notice(bot, event, _template("group_ads.driver_text", name_html), driver_notice_kb())
            ad.prompt_message_id = notice.message_id if notice else None
        await session.commit()
        return True

    prompt = await _post_notice(bot, event, _template("group_ads.ask_text", name_html), question_kb(ad.id))
    if prompt is None:
        # Couldn't ask (flood limit, missing rights) — leave the member's message where it is.
        await session.delete(ad)
        await session.commit()
        return False
    ad.prompt_message_id = prompt.message_id
    await session.commit()
    await _delete(bot, event.chat.id, event.message_id)
    return True


async def answer(bot: Bot, session: AsyncSession, ad: GroupAd, role: str) -> str | None:
    """Applies a 🙋/🚖 tap on the question. Returns an error to show the tapper, or None."""
    if ad.status != "PENDING":
        return "Bu savolga allaqachon javob berilgan."
    source = (await session.execute(select(Group).where(Group.chat_id == ad.source_chat_id))).scalar_one_or_none()
    name_html = mention(ad.author_telegram_id, ad.author_name)
    ad.role = role
    ad.answered_at = datetime.utcnow()

    if role == PASSENGER:
        target = await linked_group(session, source) if source else None
        if target is None:
            ad.role = None
            await session.commit()
            return "Bu guruh hali haydovchilar guruhiga biriktirilmagan. Adminga murojaat qiling."
        if not await send_to_drivers(bot, session, ad, target):
            ad.role = None
            await session.commit()
            return "Hozir yuborib bo'lmadi, birozdan keyin qayta bosing."
        text = _template("group_ads.passenger_text", name_html)
        markup = passenger_notice_kb(ad.id, await bot_username(bot))
    else:
        ad.status = DRIVER
        await session.commit()
        text = _template("group_ads.driver_text", name_html)
        markup = driver_notice_kb()

    try:
        await bot.edit_message_text(
            text, chat_id=ad.source_chat_id, message_id=ad.prompt_message_id, parse_mode="HTML",
            reply_markup=markup, disable_web_page_preview=True,
        )
    except TelegramAPIError:
        pass
    return None


async def take(bot: Bot, session: AsyncSession, ad: GroupAd, driver_id: int, driver_name: str) -> str | None:
    if ad.status == "TAKEN":
        return f"Bu e'lonni {ad.taken_by_name or 'boshqa haydovchi'} allaqachon olgan."
    if ad.status != "SENT":
        return "Bu e'lon endi faol emas."
    ad.status = "TAKEN"
    ad.taken_by_telegram_id = driver_id
    ad.taken_by_name = driver_name
    await session.commit()
    await refresh_card(bot, ad, await _source_title(session, ad.source_chat_id))

    # The passenger hears about it only if they've ever started the bot (bots can't DM first).
    try:
        await bot.send_message(
            ad.author_telegram_id,
            f"🚖 E'loningizni haydovchi {mention(driver_id, driver_name)} qabul qildi — tez orada siz bilan bog'lanadi.",
            parse_mode="HTML",
        )
    except TelegramAPIError:
        pass
    return None


async def release(bot: Bot, session: AsyncSession, ad: GroupAd, driver_id: int) -> str | None:
    if ad.status != "TAKEN":
        return "Bu e'lon band emas."
    if ad.taken_by_telegram_id != driver_id:
        return "Faqat e'lonni olgan haydovchi bo'shata oladi."
    ad.status = "SENT"
    ad.taken_by_telegram_id = None
    ad.taken_by_name = None
    await session.commit()
    await refresh_card(bot, ad, await _source_title(session, ad.source_chat_id))
    return None


async def resubmit(bot: Bot, session: AsyncSession, ad: GroupAd, text: str, photo_file_id: str | None) -> bool:
    """The passenger's «Yuborish» flow in DM: a still-open card is edited in place; one that was
    taken, cancelled or deleted is replaced by a fresh card (a new row, so the log keeps both)."""
    source = (await session.execute(select(Group).where(Group.chat_id == ad.source_chat_id))).scalar_one_or_none()
    title = source.title if source else None

    if ad.status == "SENT" and bool(photo_file_id) == bool(ad.photo_file_id):
        ad.text = text
        ad.photo_file_id = photo_file_id or ad.photo_file_id
        await session.commit()
        if await refresh_card(bot, ad, title, edited=True):
            return True

    target = await linked_group(session, source) if source else None
    if target is None:
        return False
    if ad.status == "SENT":
        await _delete(bot, ad.target_chat_id, ad.card_message_id)
        ad.status = "CANCELLED"
    fresh = GroupAd(
        source_chat_id=ad.source_chat_id,
        author_telegram_id=ad.author_telegram_id,
        author_name=ad.author_name,
        author_username=ad.author_username,
        text=text,
        photo_file_id=photo_file_id,
        role=PASSENGER,
        answered_at=datetime.utcnow(),
        # The open-group notice stays with the old row, so its cleanup timer is unaffected.
        prompt_deleted=True,
    )
    session.add(fresh)
    await session.flush()
    return await send_to_drivers(bot, session, fresh, target)


async def cancel(bot: Bot, session: AsyncSession, ad: GroupAd) -> None:
    if ad.status in ("SENT", "TAKEN"):
        ad.status = "CANCELLED"
        await session.commit()
        await refresh_card(bot, ad, await _source_title(session, ad.source_chat_id))


async def latest_for_author(session: AsyncSession, ad: GroupAd) -> GroupAd:
    """«Yuborish» on an old notice should act on the passenger's newest ad from that group."""
    result = await session.execute(
        select(GroupAd)
        .where(
            GroupAd.source_chat_id == ad.source_chat_id,
            GroupAd.author_telegram_id == ad.author_telegram_id,
            GroupAd.role == PASSENGER,
        )
        .order_by(GroupAd.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none() or ad


async def cleanup(bot: Bot, session: AsyncSession) -> None:
    """Scheduled every minute: unanswered questions expire, answered notices disappear."""
    now = datetime.utcnow()
    prompt_cutoff = now - timedelta(minutes=bot_config.get("group_ads.prompt_ttl_minutes"))
    notice_cutoff = now - timedelta(minutes=bot_config.get("group_ads.notice_ttl_minutes"))
    result = await session.execute(
        select(GroupAd)
        .where(
            GroupAd.prompt_message_id.is_not(None),
            GroupAd.prompt_deleted.is_(False),
            or_(
                and_(GroupAd.status == "PENDING", GroupAd.created_at <= prompt_cutoff),
                and_(GroupAd.status != "PENDING", GroupAd.answered_at <= notice_cutoff),
            ),
        )
        .limit(100)
    )
    for ad in result.scalars():
        await _delete(bot, ad.source_chat_id, ad.prompt_message_id)
        ad.prompt_deleted = True
        if ad.status == "PENDING":
            ad.status = "EXPIRED"
    await session.commit()


def serialize(ad: GroupAd) -> dict:
    return {
        "id": ad.id,
        "sourceChatId": str(ad.source_chat_id),
        "targetChatId": str(ad.target_chat_id) if ad.target_chat_id else None,
        "authorTelegramId": str(ad.author_telegram_id),
        "authorName": ad.author_name,
        "authorUsername": ad.author_username,
        "text": ad.text,
        "hasPhoto": bool(ad.photo_file_id),
        "role": ad.role,
        "status": ad.status,
        "takenByName": ad.taken_by_name,
        "createdAt": ad.created_at.isoformat() if ad.created_at else None,
        "answeredAt": ad.answered_at.isoformat() if ad.answered_at else None,
    }


async def list_recent(session: AsyncSession, *, status: str | None = None, limit: int = 100) -> list[GroupAd]:
    query = select(GroupAd).order_by(GroupAd.id.desc()).limit(min(max(limit, 1), 500))
    if status:
        query = query.where(GroupAd.status == status)
    return list((await session.execute(query)).scalars())


async def stats(session: AsyncSession, since: datetime) -> dict[str, int]:
    result = await session.execute(select(GroupAd.status).where(GroupAd.created_at >= since))
    counts: dict[str, int] = {}
    for status in result.scalars():
        counts[status] = counts.get(status, 0) + 1
    return counts
