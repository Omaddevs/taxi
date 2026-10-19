"""Takroriy e'lon himoyasi — bir haydovchi guruhni bir xil e'lonlar bilan to'ldirib yubormasin.

Guruh sozlamalari (admin panel → Guruhlar), har biri alohida yoqiladi:

* `repeat_guard`    — kutish vaqti: bir kishi bir guruhga `repeat.cooldown_minutes` ichida faqat
                      bitta e'lon joylaydi; vaqtidan oldingisi o'chiriladi.
* `duplicate_guard` — bir xil e'lon: shu matn yoki shu telefon raqamli e'lon `repeat.duplicate_hours`
                      ichida guruhda bo'lsa (boshqa akkauntdan bo'lsa ham), yangisi o'chiriladi.
* `repeat_mute`     — jazo: `repeat.strikes_to_mute` marta buzgan kishi guruhda `repeat.mute_hours`
                      soat yoza olmaydi; 7 kun ichida yana jazolansa — `repeat.mute_repeat_hours`.

Faqat e'longa o'xshagan xabarlar hisoblanadi (telefon raqami, yo'nalish yoki uzun matn) — guruhdagi
oddiy "ok", "rahmat" kabi gaplarga tegilmaydi. Guruh adminlari umuman tekshirilmaydi (group_guard).
Hamma narsa `features.repeat_guard` umumiy tugmasi yoqilgandagina ishlaydi.
"""

import asyncio
import hashlib
import html
import logging
import re
import time
from datetime import datetime, timedelta, timezone

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions, Message
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Group, GroupPostEvent
from app.services import bot_config
from app.services.ad_format import parse_ad_fields

logger = logging.getLogger(__name__)

POST = "POST"
STRIKE = "STRIKE"
MUTE = "MUTE"

TASHKENT = timezone(timedelta(hours=5))
_REPEAT_MUTE_WINDOW = timedelta(days=7)
_KEEP = timedelta(days=14)
_GROUP_NOTICE_SECONDS = 45
_NOTICE_COOLDOWN_SECONDS = 600

# (chat_id, user_id) -> monotonic time of the last warning, so a flood of deleted posts doesn't
# turn into a flood of warnings. In-memory is fine: losing it on restart costs one extra warning.
_last_notice: dict[tuple[int, int], float] = {}

_MIN_AD_LENGTH = 60


def is_active(group: Group) -> bool:
    settings = group.settings or {}
    return bool(
        bot_config.get("features.repeat_guard")
        and (settings.get("repeat_guard") or settings.get("duplicate_guard"))
    )


def fingerprint(text: str) -> str:
    """Case, punctuation, emoji and spacing don't make an ad "new"."""
    normalized = " ".join(re.sub(r"[\W_]+", " ", text.lower()).split())
    return hashlib.sha1(normalized.encode()).hexdigest()[:20]


def _digits(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return digits[-9:]  # +998 90 123 45 67 / 90 123 45 67 / 8 90 … — the last 9 digits identify it


def _looks_like_ad(text: str, phones: list[str], has_route: bool) -> bool:
    return bool(phones) or has_route or len(text) >= _MIN_AD_LENGTH


def _format_interval(minutes: int) -> str:
    hours, mins = divmod(minutes, 60)
    if hours and mins:
        return f"{hours} soat {mins} daqiqa"
    return f"{hours} soat" if hours else f"{mins} daqiqa"


def _local_time(moment: datetime) -> str:
    local = moment.replace(tzinfo=timezone.utc).astimezone(TASHKENT)
    today = datetime.now(TASHKENT).date()
    return local.strftime("%H:%M") if local.date() == today else local.strftime("%d.%m %H:%M")


def _mention(user_id: int, name: str) -> str:
    return f'<a href="tg://user?id={user_id}">{html.escape(name or "Foydalanuvchi")}</a>'


def _render(key: str, **values: str) -> str:
    """Admin-edited text is escaped as a whole; only our placeholders put markup in."""
    text = html.escape(bot_config.get(key), quote=False)
    for name, value in values.items():
        text = text.replace("{" + name + "}", value)
    return text


async def check(bot: Bot, session: AsyncSession, group: Group, event: Message) -> bool:
    """Called by the group guard for a non-admin's message. True means the message broke the rule
    and was deleted; False lets it through (and, if it is an ad, remembers it)."""
    if event.from_user is None or not is_active(group):
        return False
    settings = group.settings or {}
    text = (event.text or event.caption or "").strip()
    if not text:
        return False
    parsed = parse_ad_fields(text)
    phones = sorted({p for p in (_digits(x) for x in parsed.phones) if len(p) == 9})
    if not _looks_like_ad(text, phones, bool(parsed.origins or parsed.destinations)):
        return False

    if bot_config.get("repeat.exempt_subscribed"):
        # Imported lazily: group_ads imports a lot and this module should stay cheap to load.
        from app.services.group_ads import _is_subscribed_driver

        if await _is_subscribed_driver(session, event.from_user.id):
            return False

    chat_id, user_id = event.chat.id, event.from_user.id
    name = event.from_user.full_name
    now = datetime.utcnow()
    fp = fingerprint(text)

    reason: str | None = None
    allowed_at: datetime | None = None

    if settings.get("repeat_guard"):
        cooldown = timedelta(minutes=bot_config.get("repeat.cooldown_minutes"))
        last = await session.scalar(
            select(func.max(GroupPostEvent.created_at)).where(
                GroupPostEvent.chat_id == chat_id,
                GroupPostEvent.user_telegram_id == user_id,
                GroupPostEvent.kind == POST,
                GroupPostEvent.created_at >= now - cooldown,
            )
        )
        if last is not None:
            reason, allowed_at = "cooldown", last + cooldown

    if reason is None and settings.get("duplicate_guard"):
        window = timedelta(hours=bot_config.get("repeat.duplicate_hours"))
        same = [GroupPostEvent.fingerprint == fp]
        same += [GroupPostEvent.phones.contains(f",{p},") for p in phones]
        first = await session.scalar(
            select(func.max(GroupPostEvent.created_at)).where(
                GroupPostEvent.chat_id == chat_id,
                GroupPostEvent.kind == POST,
                GroupPostEvent.created_at >= now - window,
                or_(*same),
            )
        )
        if first is not None:
            reason, allowed_at = "duplicate", first + window

    if reason is None:
        session.add(
            GroupPostEvent(
                chat_id=chat_id,
                user_telegram_id=user_id,
                user_name=name,
                kind=POST,
                fingerprint=fp,
                phones=f",{','.join(phones)}," if phones else None,
                created_at=now,
            )
        )
        await session.commit()
        return False

    try:
        await bot.delete_message(chat_id, event.message_id)
    except TelegramAPIError as exc:
        # Without the "delete messages" right the guard can't do anything — let the post through.
        logger.warning("repeat guard can't delete in %s: %s", chat_id, exc)
        return False

    session.add(GroupPostEvent(chat_id=chat_id, user_telegram_id=user_id, user_name=name, kind=STRIKE, reason=reason, created_at=now))
    await session.commit()

    muted_until = None
    if settings.get("repeat_mute"):
        muted_until = await _maybe_mute(bot, session, chat_id, user_id, name, now)

    await _notify(bot, event, reason, allowed_at, muted_until)
    return True


async def _maybe_mute(bot: Bot, session: AsyncSession, chat_id: int, user_id: int, name: str, now: datetime) -> datetime | None:
    last_mute = await session.scalar(
        select(func.max(GroupPostEvent.created_at)).where(
            GroupPostEvent.chat_id == chat_id,
            GroupPostEvent.user_telegram_id == user_id,
            GroupPostEvent.kind == MUTE,
        )
    )
    since = now - timedelta(hours=bot_config.get("repeat.strike_window_hours"))
    if last_mute is not None and last_mute > since:
        since = last_mute  # strikes before the last punishment are already paid for
    strikes = await session.scalar(
        select(func.count()).select_from(GroupPostEvent).where(
            GroupPostEvent.chat_id == chat_id,
            GroupPostEvent.user_telegram_id == user_id,
            GroupPostEvent.kind == STRIKE,
            GroupPostEvent.created_at > since,
        )
    )
    if (strikes or 0) < bot_config.get("repeat.strikes_to_mute"):
        return None

    repeat = last_mute is not None and now - last_mute < _REPEAT_MUTE_WINDOW
    hours = bot_config.get("repeat.mute_repeat_hours" if repeat else "repeat.mute_hours")
    until = now + timedelta(hours=hours)
    try:
        await bot.restrict_chat_member(
            chat_id,
            user_id,
            permissions=ChatPermissions(can_send_messages=False),
            until_date=until.replace(tzinfo=timezone.utc),
        )
    except TelegramAPIError as exc:
        # Usually the bot lacks the "ban users" admin right — deleting still works.
        logger.warning("repeat guard can't restrict %s in %s: %s", user_id, chat_id, exc)
        return None
    session.add(GroupPostEvent(chat_id=chat_id, user_telegram_id=user_id, user_name=name, kind=MUTE, until=until, created_at=now))
    await session.commit()
    return until


async def _notify(bot: Bot, event: Message, reason: str, allowed_at: datetime | None, muted_until: datetime | None) -> None:
    """Explains the deletion in a private message; if the person never opened the bot, a short
    notice goes to the group instead and disappears after a minute."""
    user = event.from_user
    key = (event.chat.id, user.id)
    now = time.monotonic()
    if muted_until is None and now - _last_notice.get(key, 0) < _NOTICE_COOLDOWN_SECONDS:
        return
    _last_notice[key] = now

    name = _mention(user.id, user.full_name)
    if muted_until is not None:
        hours = round((muted_until - datetime.utcnow()).total_seconds() / 3600)
        text = _render("repeat.mute_text", name=name, hours=str(max(1, hours)), time=_local_time(muted_until))
    elif reason == "duplicate":
        text = _render("repeat.duplicate_text", name=name, time=_local_time(allowed_at) if allowed_at else "")
    else:
        text = _render(
            "repeat.cooldown_text",
            name=name,
            interval=_format_interval(bot_config.get("repeat.cooldown_minutes")),
            time=_local_time(allowed_at) if allowed_at else "",
        )
    title = html.escape(event.chat.title or "guruh")

    if bot_config.get("repeat.notify_private"):
        try:
            await bot.send_message(user.id, f"{text}\n\n<i>Guruh: {title}</i>", parse_mode="HTML")
            return
        except TelegramAPIError:
            pass  # the user hasn't started the bot — fall back to the group

    if not bot_config.get("repeat.notify_group"):
        return
    thread_id = event.message_thread_id if event.is_topic_message else None
    try:
        notice = await bot.send_message(
            event.chat.id, text, parse_mode="HTML", message_thread_id=thread_id, disable_web_page_preview=True
        )
    except TelegramAPIError as exc:
        logger.warning("repeat guard notice failed in %s: %s", event.chat.id, exc)
        return
    asyncio.create_task(_delete_later(bot, notice.chat.id, notice.message_id))


async def _delete_later(bot: Bot, chat_id: int, message_id: int) -> None:
    await asyncio.sleep(_GROUP_NOTICE_SECONDS)
    try:
        await bot.delete_message(chat_id, message_id)
    except TelegramAPIError:
        pass


async def prune(session: AsyncSession) -> None:
    await session.execute(delete(GroupPostEvent).where(GroupPostEvent.created_at < datetime.utcnow() - _KEEP))
    await session.commit()


async def stats(session: AsyncSession, since: datetime) -> dict:
    """Admin panel: what the guard did since `since`, and who breaks the rule most."""
    rows = await session.execute(
        select(GroupPostEvent.kind, GroupPostEvent.reason, func.count())
        .where(GroupPostEvent.created_at >= since)
        .group_by(GroupPostEvent.kind, GroupPostEvent.reason)
    )
    totals = {"posts": 0, "cooldown": 0, "duplicate": 0, "mutes": 0}
    for kind, reason, count in rows:
        if kind == POST:
            totals["posts"] += count
        elif kind == MUTE:
            totals["mutes"] += count
        elif reason in ("cooldown", "duplicate"):
            totals[reason] += count

    offenders = await session.execute(
        select(
            GroupPostEvent.chat_id,
            GroupPostEvent.user_telegram_id,
            func.max(GroupPostEvent.user_name),
            func.count().filter(GroupPostEvent.kind == STRIKE),
            func.count().filter(GroupPostEvent.kind == MUTE),
            func.max(GroupPostEvent.created_at),
        )
        .where(GroupPostEvent.created_at >= since, GroupPostEvent.kind.in_((STRIKE, MUTE)))
        .group_by(GroupPostEvent.chat_id, GroupPostEvent.user_telegram_id)
        .order_by(func.count().filter(GroupPostEvent.kind == STRIKE).desc())
        .limit(30)
    )
    offenders = offenders.all()
    now = datetime.utcnow()
    active = await session.execute(
        select(GroupPostEvent.chat_id, GroupPostEvent.user_telegram_id, func.max(GroupPostEvent.until))
        .where(GroupPostEvent.kind == MUTE, GroupPostEvent.until > now)
        .group_by(GroupPostEvent.chat_id, GroupPostEvent.user_telegram_id)
    )
    muted_now = {(chat, user): until for chat, user, until in active}
    chat_ids = {row[0] for row in offenders} | {chat for chat, _ in muted_now}
    titles = dict((await session.execute(select(Group.chat_id, Group.title).where(Group.chat_id.in_(chat_ids)))).all()) if chat_ids else {}

    def iso(moment: datetime | None) -> str | None:
        return moment.isoformat() + "Z" if moment else None

    return {
        "totals": totals,
        "offenders": [
            {
                "chatId": chat_id,
                "chatTitle": titles.get(chat_id),
                "telegramId": user_id,
                "name": name,
                "strikes": strikes,
                "mutes": mutes,
                "lastAt": iso(last),
                "mutedUntil": iso(muted_now.get((chat_id, user_id))),
            }
            for chat_id, user_id, name, strikes, mutes, last in offenders
        ],
    }


async def unmute(bot: Bot, session: AsyncSession, chat_id: int, user_id: int) -> None:
    """Admin panel's «Cheklovni olish»: lifts the restriction and forgives the strikes."""
    await bot.restrict_chat_member(
        chat_id,
        user_id,
        permissions=ChatPermissions(
            can_send_messages=True,
            can_send_audios=True,
            can_send_documents=True,
            can_send_photos=True,
            can_send_videos=True,
            can_send_video_notes=True,
            can_send_voice_notes=True,
            can_send_polls=True,
            can_send_other_messages=True,
            can_add_web_page_previews=True,
        ),
    )
    now = datetime.utcnow()
    mutes = await session.execute(
        select(GroupPostEvent).where(
            GroupPostEvent.chat_id == chat_id,
            GroupPostEvent.user_telegram_id == user_id,
            GroupPostEvent.kind == MUTE,
            GroupPostEvent.until > now,
        )
    )
    for row in mutes.scalars():
        row.until = now
    await session.execute(
        delete(GroupPostEvent).where(
            GroupPostEvent.chat_id == chat_id,
            GroupPostEvent.user_telegram_id == user_id,
            GroupPostEvent.kind == STRIKE,
        )
    )
    await session.commit()
