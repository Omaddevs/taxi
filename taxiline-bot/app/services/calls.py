"""«📞 Tel qilish» buttons and the call log behind Bot sozlamalari → Aloqa.

Telegram buttons can't hold tel: links, so the button opens the website's /call.html with a
signed reference to the ad (`k`ind + `i`d + `s`ignature) — never the phone itself. The page
asks server/ (POST /calls), which forwards here (/webapp/call): we check the signature, look
up the phone, log the call and hand the number back for the dialer.

Who called: the button is a Telegram `login_url` button, so Telegram appends the tapper's
signed identity (id, name, username, auth_date, hash) to the URL — verified here with the bot
token. That needs the website domain set for the bot in @BotFather (/setdomain). If Telegram
rejects the button (BOT_DOMAIN_INVALID), we fall back to a plain URL for the rest of the
process's life — calls are then still counted, just with an unknown caller.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode

from aiogram.types import CopyTextButton, LoginUrl
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import BotUser, CallLog, DriverProfile, FormattedAd, Group, GroupAd
from app.services import bot_config
from app.services.ad_format import parse_ad_fields
from app.services.phone import format_phone

logger = logging.getLogger(__name__)

FORMATTED = "fa"  # formatted_ads — an ad reposted in an open group
GROUP_AD = "ga"  # group_ads — a passenger card in a closed driver group
KINDS = (FORMATTED, GROUP_AD)

# A page reload or a double tap within this window isn't a second call.
_DEDUP_WINDOW = timedelta(seconds=90)
_AUTH_MAX_AGE = timedelta(days=1)

_login_url_ok = True


def sign(kind: str, ad_id: int) -> str:
    message = f"{kind}:{ad_id}".encode()
    return hmac.new(settings.bot_api_secret.encode(), message, hashlib.sha256).hexdigest()[:20]


def _valid_signature(kind: str, ad_id: int, signature: str) -> bool:
    return hmac.compare_digest(sign(kind, ad_id), signature or "")


def is_login_url_error(exc: Exception) -> bool:
    return "DOMAIN" in str(exc).upper()


def disable_login_url() -> None:
    global _login_url_ok
    if _login_url_ok:
        logger.warning(
            "Telegram rejected login_url call buttons (bot domain not set in @BotFather → /setdomain); "
            "falling back to plain links — callers will be logged as unknown"
        )
    _login_url_ok = False


def button(text: str, kind: str, ad_id: int, phone: str) -> dict:
    """InlineKeyboardBuilder.button() kwargs. A non-https WEBAPP_URL (local dev) gets a
    copy-number button instead — Telegram rejects localhost URLs."""
    base = settings.webapp_url.rstrip("/")
    if not base.startswith("https://"):
        return {"text": f"📞 {format_phone(phone)}", "copy_text": CopyTextButton(text=phone)}
    url = f"{base}/call.html?{urlencode({'k': kind, 'i': ad_id, 's': sign(kind, ad_id)})}"
    if _login_url_ok and bot_config.get("features.call_login"):
        return {"text": text, "login_url": LoginUrl(url=url, request_write_access=False)}
    return {"text": text, "url": url}


def verify_telegram_auth(data: dict | None) -> dict | None:
    """Telegram login data (as appended by a login_url button) → the user dict, or None if
    absent, forged or stale. https://core.telegram.org/widgets/login#checking-authorization"""
    if not data or not data.get("hash") or not data.get("id"):
        return None
    fields = {k: str(v) for k, v in data.items() if k != "hash" and v is not None and v != ""}
    check = "\n".join(f"{k}={fields[k]}" for k in sorted(fields))
    secret = hashlib.sha256(settings.bot_token.encode()).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, str(data["hash"])):
        return None
    try:
        auth_date = datetime.utcfromtimestamp(int(fields.get("auth_date", "0")))
    except ValueError:
        return None
    if datetime.utcnow() - auth_date > _AUTH_MAX_AGE:
        return None
    return fields


async def _target(session: AsyncSession, kind: str, ad_id: int) -> dict | None:
    if kind == FORMATTED:
        ad = await session.get(FormattedAd, ad_id)
        if ad is None or not ad.phone:
            return None
        chat_id = ad.chat_id
        return {
            "phone": ad.phone,
            "owner_telegram_id": ad.author_telegram_id,
            "owner_name": ad.author_name,
            "owner_username": ad.author_username,
            "chat_id": chat_id,
            "role": "PASSENGER" if ad.is_passenger else "DRIVER",
        }
    ad = await session.get(GroupAd, ad_id)
    if ad is None:
        return None
    phones = parse_ad_fields(ad.text).phones
    if not phones:
        return None
    return {
        "phone": phones[0],
        "owner_telegram_id": ad.author_telegram_id or None,
        "owner_name": ad.author_name,
        "owner_username": ad.author_username,
        "chat_id": ad.target_chat_id,
        "role": "PASSENGER",
    }


async def record(
    session: AsyncSession,
    *,
    kind: str,
    ad_id: int,
    signature: str,
    auth: dict | None,
    user_agent: str | None,
    ip: str | None,
) -> dict | None:
    """Logs one call and returns what the call page shows; None for a bad or unknown link."""
    if kind not in KINDS or not _valid_signature(kind, ad_id, signature):
        return None
    target = await _target(session, kind, ad_id)
    if target is None:
        return None

    caller = verify_telegram_auth(auth)
    caller_id = int(caller["id"]) if caller else None
    caller_name = " ".join(filter(None, [caller.get("first_name"), caller.get("last_name")])) if caller else None

    chat_title = None
    if target["chat_id"]:
        chat_title = (await session.execute(select(Group.title).where(Group.chat_id == target["chat_id"]))).scalar_one_or_none()

    since = datetime.utcnow() - _DEDUP_WINDOW
    duplicate = select(CallLog.id).where(CallLog.ad_kind == kind, CallLog.ad_id == ad_id, CallLog.created_at >= since)
    duplicate = (
        duplicate.where(CallLog.caller_telegram_id == caller_id)
        if caller_id
        else duplicate.where(CallLog.caller_telegram_id.is_(None), CallLog.ip == ip, CallLog.user_agent == user_agent)
    )
    if (await session.execute(duplicate.limit(1))).scalar_one_or_none() is None:
        session.add(
            CallLog(
                ad_kind=kind,
                ad_id=ad_id,
                phone=target["phone"],
                owner_telegram_id=target["owner_telegram_id"],
                owner_name=target["owner_name"],
                owner_username=target["owner_username"],
                owner_role=target["role"],
                chat_id=target["chat_id"],
                chat_title=chat_title,
                caller_telegram_id=caller_id,
                caller_name=caller_name,
                caller_username=caller.get("username") if caller else None,
                user_agent=(user_agent or "")[:300] or None,
                ip=(ip or "")[:64] or None,
            )
        )
        await session.commit()

    return {
        "phone": target["phone"],
        "phoneDisplay": format_phone(target["phone"]),
        "ownerName": target["owner_name"],
        "role": target["role"],
        "chatTitle": chat_title,
        "callerName": caller_name,
    }


async def report(session: AsyncSession, *, days: int, phone: str | None = None, limit: int = 300) -> dict:
    """Bot sozlamalari → Aloqa: per-number totals, the call log, and headline numbers."""
    since = datetime.utcnow() - timedelta(days=days)
    base = select(CallLog).where(CallLog.created_at >= since)
    if phone:
        base = base.where(CallLog.phone == phone)
    calls = list((await session.execute(base.order_by(CallLog.id.desc()).limit(limit))).scalars())

    summary_q = (
        select(
            CallLog.phone,
            func.count(CallLog.id),
            func.count(func.distinct(CallLog.caller_telegram_id)),
            func.max(CallLog.created_at),
            func.max(CallLog.owner_name),
            func.max(CallLog.owner_username),
            func.max(CallLog.owner_telegram_id),
            func.max(CallLog.chat_title),
            func.max(CallLog.owner_role),
        )
        .where(CallLog.created_at >= since)
        .group_by(CallLog.phone)
        .order_by(func.count(CallLog.id).desc())
        .limit(200)
    )
    summary = [
        {
            "phone": row[0],
            "phoneDisplay": format_phone(row[0]),
            "calls": row[1],
            "knownCallers": row[2],
            "lastAt": row[3].isoformat() if row[3] else None,
            "ownerName": row[4],
            "ownerUsername": row[5],
            "ownerTelegramId": str(row[6]) if row[6] else None,
            "chatTitle": row[7],
            "ownerRole": row[8],
        }
        for row in (await session.execute(summary_q)).all()
    ]

    totals_row = (
        await session.execute(
            select(
                func.count(CallLog.id),
                func.count(CallLog.caller_telegram_id),
                func.count(func.distinct(CallLog.caller_telegram_id)),
                func.count(func.distinct(CallLog.phone)),
            ).where(CallLog.created_at >= since)
        )
    ).one()

    # Mark callers who are registered drivers, so "kim qo'ng'iroq qildi" reads at a glance.
    caller_ids = {c.caller_telegram_id for c in calls if c.caller_telegram_id}
    drivers: set[int] = set()
    if caller_ids:
        drivers = set(
            (
                await session.execute(
                    select(BotUser.telegram_id)
                    .join(DriverProfile, DriverProfile.bot_user_id == BotUser.id)
                    .where(BotUser.telegram_id.in_(caller_ids), DriverProfile.status == "APPROVED")
                )
            ).scalars()
        )

    return {
        "totals": {
            "calls": totals_row[0],
            "identifiedCalls": totals_row[1],
            "uniqueCallers": totals_row[2],
            "numbers": totals_row[3],
        },
        "loginButtons": _login_url_ok and bool(bot_config.get("features.call_login")),
        "summary": summary,
        "calls": [
            {
                "id": c.id,
                "createdAt": c.created_at.isoformat() if c.created_at else None,
                "phone": c.phone,
                "phoneDisplay": format_phone(c.phone),
                "ownerName": c.owner_name,
                "ownerUsername": c.owner_username,
                "ownerRole": c.owner_role,
                "chatTitle": c.chat_title,
                "adKind": c.ad_kind,
                "callerTelegramId": str(c.caller_telegram_id) if c.caller_telegram_id else None,
                "callerName": c.caller_name,
                "callerUsername": c.caller_username,
                "callerIsDriver": c.caller_telegram_id in drivers,
                "userAgent": c.user_agent,
            }
            for c in calls
        ],
    }
