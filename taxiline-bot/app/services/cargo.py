"""Website cargo orders ("Yetkazib berish") in Telegram.

The order lives on server/ — this module only posts it to the matching closed driver group and
to every approved driver who serves the route (with a "✅ Qabul qilish" button), remembers those
messages in `cargo_dispatches`, and rewrites them when the order is taken, delivered or
cancelled — whether that happened here or on the website.

Phone numbers are never in the public card: only the driver who takes the job gets them, in a
private message.
"""

import html
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.data.regions import REGION_NAMES
from app.db.models import CargoDispatch, DriverProfile
from app.services import groups as groups_service

logger = logging.getLogger(__name__)

TAKEN_LABEL = "🔒 Band qilindi"
DELIVERED_LABEL = "✅ Yetkazildi"
CANCELLED_LABEL = "❌ Bekor qilindi"


def _e(value) -> str:
    return html.escape(str(value or ""))


def _som(amount) -> str:
    try:
        return f"{int(amount):,}".replace(",", " ") + " so'm"
    except (TypeError, ValueError):
        return f"{amount} so'm"


def render_public_card(p: dict) -> str:
    """What drivers see before taking the job: route, what, how heavy, price — no phones."""
    kind = " · ".join(x for x in (p.get("cargoType"), p.get("weightLabel"), p.get("vehicle")) if x)
    lines = [
        "📦 <b>Yangi yuk</b> — TaxiLine",
        "",
        f"🏷 {_e(kind)}",
        f"🟢 <b>Olish:</b> {_e(p.get('fromLabel'))}",
        f"🔴 <b>Yetkazish:</b> {_e(p.get('toLabel'))}",
    ]
    if p.get("note"):
        lines.append(f"📝 {_e(p.get('note'))}")
    lines += ["", f"💵 <b>{_som(p.get('price'))}</b>"]
    return "\n".join(lines)


def render_full_card(order: dict, *, delivered: bool = False) -> str:
    """For the driver who took it: everything needed to do the job."""
    rider = order.get("rider") or {}
    lines = [
        DELIVERED_LABEL if delivered else "✅ <b>Yuk sizda!</b>",
        "",
        f"🟢 <b>Olish:</b> {_e(order.get('fromLabel'))}",
        f"🔴 <b>Yetkazish:</b> {_e(order.get('toLabel'))}",
        f"🏷 {_e(order.get('weightLabel'))}",
    ]
    if order.get("note"):
        lines.append(f"📝 {_e(order.get('note'))}")
    lines += [
        "",
        f"📤 <b>Jo'natuvchi:</b> {_e(rider.get('name') or 'Mijoz')} — {_e(rider.get('phone'))}",
        f"📥 <b>Qabul qiluvchi:</b> {_e(order.get('recipientName'))} — {_e(order.get('recipientPhone'))}",
        "",
        f"💵 <b>{_som(order.get('price'))}</b>",
    ]
    if not delivered:
        lines += ["", "Yetkazib bo'lgach, «✅ Yetkazildi» tugmasini bosing."]
    return "\n".join(lines)


def claim_kb(cargo_order_id: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Qabul qilish", callback_data=f"cargoclaim:{cargo_order_id}")
    return builder.as_markup()


def done_kb(cargo_order_id: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Yetkazildi", callback_data=f"cargodone:{cargo_order_id}")
    if settings.webapp_url.startswith("https://"):
        builder.button(text="🌐 Saytda ochish", url=f"{settings.webapp_url.rstrip('/')}/driver/cargo?id={cargo_order_id}")
    builder.adjust(1)
    return builder.as_markup()


async def _drivers_for(session: AsyncSession, from_region: str | None, to_region: str | None) -> list[DriverProfile]:
    """Approved, unblocked, subscribed drivers whose work route covers this cargo."""
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(DriverProfile.status == "APPROVED", DriverProfile.blocked.is_(False))
    )
    return [
        d
        for d in result.scalars()
        if groups_service.driver_serves(d, from_region, to_region) and d.subscription is not None and d.subscription.active
    ]


async def dispatch(bot: Bot, session: AsyncSession, payload: dict) -> dict:
    """Posts a new cargo order to its driver group(s) and to every matching driver's DM."""
    cargo_id = str(payload.get("cargoOrderId") or "")
    if not cargo_id:
        return {"groups": 0, "drivers": 0}
    # The website says "Andijon", the bot "Andijon viloyati".
    from_region = groups_service.canonical_region(payload.get("fromRegion"), REGION_NAMES)
    to_region = groups_service.canonical_region(payload.get("toRegion"), REGION_NAMES)
    card = render_public_card(payload)

    groups = 0
    reached: set[int] = set()
    for group, thread_id in await groups_service.resolve_order_dispatch_targets(session, from_region, to_region):
        try:
            message = await bot.send_message(
                group.chat_id, card, reply_markup=claim_kb(cargo_id), message_thread_id=thread_id, parse_mode="HTML"
            )
        except TelegramAPIError:
            logger.warning("cargo %s: could not post to group %s", cargo_id, group.chat_id)
            continue
        session.add(CargoDispatch(cargo_order_id=cargo_id, chat_id=group.chat_id, message_id=message.message_id, kind="GROUP", card=card))
        reached.add(group.chat_id)
        groups += 1

    drivers = 0
    for driver in await _drivers_for(session, from_region, to_region):
        chat_id = driver.bot_user.telegram_id
        if chat_id in reached:
            continue
        try:
            message = await bot.send_message(chat_id, card, reply_markup=claim_kb(cargo_id), parse_mode="HTML")
        except TelegramAPIError:
            continue
        session.add(CargoDispatch(cargo_order_id=cargo_id, chat_id=chat_id, message_id=message.message_id, kind="DRIVER_DM", card=card))
        drivers += 1

    await session.commit()
    if not groups and not drivers:
        logger.warning("cargo %s (%s → %s): no driver group or driver serves this route", cargo_id, from_region, to_region)
    return {"groups": groups, "drivers": drivers}


async def set_status(
    bot: Bot,
    session: AsyncSession,
    cargo_id: str,
    status: str,
    *,
    driver_name: str | None = None,
    skip_chat_id: int | None = None,
) -> int:
    """Rewrites every Telegram copy for a new status. NEW puts the claim button back (the driver
    backed out); CLAIMED / DELIVERED / CANCELLED leave a label and no buttons. `skip_chat_id`
    leaves the claiming driver's own DM alone — it is being turned into the full card."""
    result = await session.execute(select(CargoDispatch).where(CargoDispatch.cargo_order_id == cargo_id))
    edited = 0
    for d in result.scalars():
        if skip_chat_id is not None and d.chat_id == skip_chat_id:
            continue
        if status == "NEW":
            text, markup = f"🔁 <b>Yana ochiq</b>\n\n{d.card}", claim_kb(cargo_id)
        elif status == "CLAIMED":
            who = f" — {_e(driver_name)}" if driver_name else ""
            text, markup = f"{TAKEN_LABEL}{who}\n\n{d.card}", None
        elif status == "DELIVERED":
            text, markup = f"{DELIVERED_LABEL}\n\n{d.card}", None
        else:
            text, markup = f"{CANCELLED_LABEL}\n\n{d.card}", None
        try:
            await bot.edit_message_text(text, chat_id=d.chat_id, message_id=d.message_id, reply_markup=markup, parse_mode="HTML")
            edited += 1
        except TelegramAPIError:
            continue
    return edited
