from datetime import datetime, timedelta

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import FSInputFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import BotUser, DriverProfile, Order, OrderDispatch
from app.i18n.translations import t
from app.keyboards.trip import luggage_label, order_claim_kb, rating_kb, seat_label
from app.services import groups as groups_service
from app.tts.engine import synth

FRESH_THRESHOLD_MIN = 5
STALE_THRESHOLD_MIN = 30
RELABEL_WINDOW = timedelta(hours=2)

SOURCE_KEYS = {"BOT": "order_source_bot", "WEBAPP": "order_source_webapp", "GROUP": "order_source_group"}


async def create_order(session: AsyncSession, bot_user: BotUser, data: dict) -> Order:
    order = Order(
        bot_user_id=bot_user.id,
        passenger_name=data["passenger_name"],
        passenger_phone=data["passenger_phone"],
        for_someone_else=data["for_someone_else"],
        contact_note=data.get("contact_note"),
        pickup_lat=data.get("pickup_lat"),
        pickup_lng=data.get("pickup_lng"),
        pickup_text=data.get("pickup_text"),
        from_region=data["from_region"],
        from_district=data["from_district"],
        to_region=data["to_region"],
        to_district=data["to_district"],
        car_brand=data["car_brand"],
        seat=data["seat"],
        passengers=data["passengers"],
        luggage_size=data["luggage_size"],
        when_text=data["when_text"],
        source=data.get("source", "BOT"),
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return order


def status_label(order: Order, lang: str) -> str:
    age_minutes = (datetime.utcnow() - order.created_at).total_seconds() / 60
    if age_minutes < FRESH_THRESHOLD_MIN:
        return t("order_status_new", lang)
    if age_minutes < STALE_THRESHOLD_MIN:
        return t("order_status_fresh", lang, mins=int(age_minutes))
    return t("order_status_stale", lang)


def render_card(order: Order, lang: str) -> str:
    pickup_line = ""
    if order.pickup_lat is not None and order.pickup_lng is not None:
        link = f"https://maps.google.com/?q={order.pickup_lat},{order.pickup_lng}"
        pickup_line = t("pickup_map_line", lang, link=link)
    elif order.pickup_text:
        pickup_line = f"📌 {order.pickup_text}\n"

    contact_line = f"📝 {order.contact_note}\n" if order.contact_note else ""

    return t(
        "dispatch_card",
        lang,
        status_label=status_label(order, lang),
        source=t(SOURCE_KEYS.get(order.source, "order_source_bot"), lang),
        passenger_name=order.passenger_name,
        passenger_phone=order.passenger_phone,
        from_region=order.from_region,
        from_district=order.from_district,
        to_region=order.to_region,
        to_district=order.to_district,
        car_brand=order.car_brand,
        seat=seat_label(order.seat, lang),
        passengers=order.passengers,
        luggage_size=luggage_label(order.luggage_size, lang),
        when_text=order.when_text,
        pickup_line=pickup_line,
        contact_note_line=contact_line,
    )


async def _send_voice(bot: Bot, chat_id: int, order: Order, lang: str) -> None:
    text = t(
        "dispatch_voice_summary",
        lang,
        from_region=order.from_region,
        to_region=order.to_region,
        passengers=order.passengers,
        when_text=order.when_text,
    )
    try:
        path = await synth(text, lang)
        await bot.send_audio(chat_id, FSInputFile(path))
    except Exception:
        # TTS is best-effort (network call to the edge-tts service) — a failure here must
        # never take down an otherwise-successful dispatch.
        pass


async def _approved_active_drivers(
    session: AsyncSession, region: str, exclude_driver_ids: set[int] | None = None
) -> list[DriverProfile]:
    result = await session.execute(
        select(DriverProfile)
        .options(selectinload(DriverProfile.bot_user), selectinload(DriverProfile.subscription))
        .where(
            DriverProfile.region == region,
            DriverProfile.status == "APPROVED",
            DriverProfile.blocked.is_(False),
        )
    )
    drivers = list(result.scalars())
    active = [d for d in drivers if d.subscription is not None and d.subscription.active]
    if exclude_driver_ids:
        active = [d for d in active if d.id not in exclude_driver_ids]
    return active


async def dispatch_order(
    bot: Bot, session: AsyncSession, order: Order, exclude_driver_ids: set[int] | None = None
) -> int:
    """Sends the order to the matching closed driver group (corridor first, then a legacy
    region-only group) and every approved, subscribed driver in that region (text + TTS voice
    note + a "Qabul qildim" claim button, each in its own recipient's language). Returns how
    many chats were reached."""
    sent = 0
    has_location = bool((order.pickup_lat is not None and order.pickup_lng is not None) or order.pickup_text)
    group = await groups_service.resolve_closed_dispatch_group(session, order.from_region, order.to_region)
    active_drivers = await _approved_active_drivers(session, order.from_region, exclude_driver_ids)

    if group is not None:
        lang = group.language or "uz"
        try:
            message = await bot.send_message(
                group.chat_id, render_card(order, lang), reply_markup=order_claim_kb(order.id, lang, has_location)
            )
            session.add(
                OrderDispatch(
                    order_id=order.id, chat_id=group.chat_id, message_id=message.message_id, kind="GROUP", language=lang
                )
            )
            await _send_voice(bot, group.chat_id, order, lang)
            sent += 1
        except TelegramAPIError:
            pass

    for driver in active_drivers:
        lang = driver.language or "uz"
        try:
            message = await bot.send_message(
                driver.bot_user.telegram_id,
                render_card(order, lang),
                reply_markup=order_claim_kb(order.id, lang, has_location),
            )
            session.add(
                OrderDispatch(
                    order_id=order.id,
                    chat_id=driver.bot_user.telegram_id,
                    message_id=message.message_id,
                    kind="DRIVER_DM",
                    language=lang,
                )
            )
            await _send_voice(bot, driver.bot_user.telegram_id, order, lang)
            sent += 1
        except TelegramAPIError:
            continue

    await session.commit()
    return sent


async def refresh_dispatch_labels(bot: Bot, session: AsyncSession) -> None:
    """Scheduled job: re-renders the 🟢/🟡/🔴 freshness label on every still-open order's
    dispatched copies (group + driver DMs). Claimed/closed orders are left alone — their
    copies were already rewritten by claim_order's caller."""
    cutoff = datetime.utcnow() - RELABEL_WINDOW
    result = await session.execute(select(Order).where(Order.status == "OPEN", Order.created_at >= cutoff))
    orders = {o.id: o for o in result.scalars()}
    if not orders:
        return

    dispatch_result = await session.execute(select(OrderDispatch).where(OrderDispatch.order_id.in_(orders.keys())))
    for dispatch in dispatch_result.scalars():
        order = orders[dispatch.order_id]
        has_location = bool((order.pickup_lat is not None and order.pickup_lng is not None) or order.pickup_text)
        try:
            await bot.edit_message_text(
                render_card(order, dispatch.language),
                chat_id=dispatch.chat_id,
                message_id=dispatch.message_id,
                reply_markup=order_claim_kb(order.id, dispatch.language, has_location),
            )
        except TelegramAPIError:
            continue


async def list_my_trips(session: AsyncSession, bot_user: BotUser, limit: int = 10) -> list[Order]:
    result = await session.execute(
        select(Order).where(Order.bot_user_id == bot_user.id).order_by(Order.created_at.desc()).limit(limit)
    )
    return list(result.scalars())


async def get_dispatch_by_message(session: AsyncSession, order_id: int, chat_id: int, message_id: int) -> OrderDispatch | None:
    result = await session.execute(
        select(OrderDispatch).where(
            OrderDispatch.order_id == order_id, OrderDispatch.chat_id == chat_id, OrderDispatch.message_id == message_id
        )
    )
    return result.scalar_one_or_none()


async def claim_order(session: AsyncSession, order_id: int, driver_id: int) -> Order | None:
    """Atomically claims an OPEN order for `driver_id`. Postgres row-level locking makes the
    WHERE status='OPEN' guard race-safe: if two drivers tap "Qabul qildim" at the same moment,
    only the first UPDATE to commit actually matches a row — the second sees 0 rows and this
    returns None."""
    result = await session.execute(
        update(Order)
        .where(Order.id == order_id, Order.status == "OPEN")
        .values(status="CLAIMED", assigned_driver_id=driver_id, claimed_at=datetime.utcnow())
        .returning(Order)
    )
    order = result.scalar_one_or_none()
    if order is None:
        # No rollback here: the UPDATE matched 0 rows so there's nothing pending to discard,
        # and session.rollback() would expire every other ORM object the caller is holding in
        # this session (a real bug caught by testing — a losing claim used to crash the next
        # unrelated attribute access in the same request with MissingGreenlet).
        return None
    await session.commit()
    return order


async def confirm_enroute(session: AsyncSession, order_id: int) -> None:
    await session.execute(update(Order).where(Order.id == order_id).values(confirmed_at=datetime.utcnow()))
    await session.commit()


async def mark_all_taken(bot: Bot, session: AsyncSession, order: Order, except_dispatch_id: int | None = None) -> None:
    """Edits every other dispatched copy of `order` (group + other drivers' DMs) to a
    no-buttons "band qilindi" label, so only the claiming driver's own message keeps acting on
    it."""
    result = await session.execute(select(OrderDispatch).where(OrderDispatch.order_id == order.id))
    for dispatch in result.scalars():
        if dispatch.id == except_dispatch_id:
            continue
        try:
            label = t("order_taken_label", dispatch.language)
            await bot.edit_message_text(
                f"{label}\n\n{render_card(order, dispatch.language)}",
                chat_id=dispatch.chat_id,
                message_id=dispatch.message_id,
            )
        except TelegramAPIError:
            continue


async def rerender_dispatches(
    bot: Bot, session: AsyncSession, order: Order, *, closed_label_key: str = "order_closed_by_admin_label"
) -> None:
    """Re-renders every dispatched copy of `order` — with a live claim button if it's OPEN, or
    a no-buttons closed-label note (looked up per-dispatch language via `closed_label_key`)
    otherwise. Used by the admin edit/publish/unpublish endpoints so a change made in the admin
    panel is reflected in every group/DM right away, the same way claim_order's mark_all_taken
    already does for claims."""
    has_location = bool((order.pickup_lat is not None and order.pickup_lng is not None) or order.pickup_text)
    result = await session.execute(select(OrderDispatch).where(OrderDispatch.order_id == order.id))
    for dispatch in result.scalars():
        try:
            if order.status == "OPEN":
                await bot.edit_message_text(
                    render_card(order, dispatch.language),
                    chat_id=dispatch.chat_id,
                    message_id=dispatch.message_id,
                    reply_markup=order_claim_kb(order.id, dispatch.language, has_location),
                )
            else:
                label = t(closed_label_key, dispatch.language)
                await bot.edit_message_text(
                    f"{label}\n\n{render_card(order, dispatch.language)}",
                    chat_id=dispatch.chat_id,
                    message_id=dispatch.message_id,
                )
        except TelegramAPIError:
            continue


async def delete_all_dispatches(bot: Bot, session: AsyncSession, order: Order) -> None:
    """Best-effort deletes every Telegram message this order was ever posted as, so an
    admin-deleted order actually disappears from every group/DM it reached."""
    result = await session.execute(select(OrderDispatch).where(OrderDispatch.order_id == order.id))
    for dispatch in result.scalars():
        try:
            await bot.delete_message(chat_id=dispatch.chat_id, message_id=dispatch.message_id)
        except TelegramAPIError:
            continue


async def perform_claim(
    bot: Bot,
    session: AsyncSession,
    order_id: int,
    driver: DriverProfile,
    except_dispatch_id: int | None = None,
) -> Order | None:
    """Claims the order for `driver`, marks every other dispatched copy as taken, and DMs the
    client the driver's contact info. Shared by the Telegram claim button and the webapp
    bridge (app/webserver.py) so the two surfaces can never behave differently — `
    except_dispatch_id` lets the Telegram path skip re-editing the message the driver just
    tapped (it renders a different "you claimed this" view right after), while the webapp
    path passes None since there's no Telegram message of its own to skip."""
    order = await claim_order(session, order_id, driver.id)
    if order is None:
        return None

    await mark_all_taken(bot, session, order, except_dispatch_id=except_dispatch_id)

    client = await session.get(BotUser, order.bot_user_id)
    if client is not None:
        try:
            await bot.send_message(
                client.telegram_id,
                t(
                    "driver_found_for_client",
                    client.language,
                    name=driver.full_name,
                    car_brand=driver.car_model,
                    plate=driver.plate,
                    phone=driver.phone,
                ),
            )
        except TelegramAPIError:
            pass

    return order


async def perform_enroute(bot: Bot, session: AsyncSession, order_id: int, driver: DriverProfile) -> bool:
    order = await session.get(Order, order_id)
    if order is None or order.assigned_driver_id != driver.id:
        return False

    await confirm_enroute(session, order_id)

    client = await session.get(BotUser, order.bot_user_id)
    if client is not None:
        try:
            await bot.send_message(client.telegram_id, t("driver_enroute_notify_client", client.language))
        except TelegramAPIError:
            pass

    return True


async def perform_complete(bot: Bot, session: AsyncSession, order_id: int, driver: DriverProfile) -> bool:
    order = await session.get(Order, order_id)
    if order is None or order.assigned_driver_id != driver.id or order.confirmed_at is None:
        return False

    order.status = "COMPLETED"
    order.finished_at = datetime.utcnow()
    await session.commit()

    # Fetched fresh rather than trusting a possibly-not-eagerly-loaded driver.bot_user
    # relationship — the exact MissingGreenlet-shaped bug already hit once earlier in this
    # codebase (see start_subscription's history).
    driver_bot_user = await session.get(BotUser, driver.bot_user_id)

    client = await session.get(BotUser, order.bot_user_id)
    if client is not None:
        client.trips_count += 1
        await session.commit()
        try:
            await bot.send_message(
                client.telegram_id,
                t("trip_completed_notify_client", client.language),
                reply_markup=rating_kb(order.id, "p", client.language),
            )
        except TelegramAPIError:
            pass

    if driver_bot_user is not None:
        try:
            await bot.send_message(
                driver_bot_user.telegram_id,
                t("trip_completed_rate_passenger_prompt", driver.language),
                reply_markup=rating_kb(order.id, "d", driver.language),
            )
        except TelegramAPIError:
            pass

    return True


async def cancel_claim(session: AsyncSession, order_id: int, driver_id: int) -> Order | None:
    """Atomically releases `driver_id`'s own CLAIMED order back to OPEN — race-safe the same
    way claim_order is (the WHERE guard only matches if this driver still actually holds it),
    so a stray double-tap or a concurrent completion can't cancel an order out from under
    someone else. Works whether or not the driver already confirmed "Yo'lda ketdim" — a driver
    backing out mid-trip is still a cancel, not a completion."""
    result = await session.execute(
        update(Order)
        .where(Order.id == order_id, Order.assigned_driver_id == driver_id, Order.status == "CLAIMED")
        .values(status="OPEN", assigned_driver_id=None, claimed_at=None, confirmed_at=None)
        .returning(Order)
    )
    order = result.scalar_one_or_none()
    if order is None:
        return None
    await session.commit()
    return order


async def perform_cancel_claim(bot: Bot, session: AsyncSession, order_id: int, driver: DriverProfile) -> Order | None:
    """Shared by the Telegram "❌ Bekor qilish" button and the webapp bridge. Deliberately does
    not touch no_show_count — that metric tracks drivers who silently flake past the claim
    timeout (release_stale_claims), not someone honestly backing out through this button."""
    order = await cancel_claim(session, order_id, driver.id)
    if order is None:
        return None

    client = await session.get(BotUser, order.bot_user_id)
    if client is not None:
        try:
            await bot.send_message(client.telegram_id, t("order_cancelled_by_driver_notify_client", client.language))
        except TelegramAPIError:
            pass

    await dispatch_order(bot, session, order, exclude_driver_ids={driver.id})
    return order


async def release_stale_claims(session: AsyncSession, timeout_minutes: int) -> list[tuple[Order, int]]:
    """Scheduled job: reverts CLAIMED orders whose driver never confirmed "Yo'ldaman" within
    the timeout back to OPEN, and increments that driver's no_show_count. Returns
    (order, flaked_driver_id) pairs so the caller can re-dispatch and notify the client."""
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    result = await session.execute(
        select(Order).where(Order.status == "CLAIMED", Order.claimed_at <= cutoff, Order.confirmed_at.is_(None))
    )
    stale = list(result.scalars())
    if not stale:
        return []

    released: list[tuple[Order, int]] = []
    driver_ids: list[int] = []
    for order in stale:
        flaked_driver_id = order.assigned_driver_id
        order.status = "OPEN"
        order.assigned_driver_id = None
        order.claimed_at = None
        if flaked_driver_id is not None:
            released.append((order, flaked_driver_id))
            driver_ids.append(flaked_driver_id)
    await session.commit()

    if driver_ids:
        await session.execute(
            update(DriverProfile)
            .where(DriverProfile.id.in_(driver_ids))
            .values(no_show_count=DriverProfile.no_show_count + 1)
        )
        await session.commit()

    return released
