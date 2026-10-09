"""Small inbound HTTP surface so server/ can talk to taxiline-bot — the reverse direction of
services/backend_client.py. Two things live here:

1. An instant Telegram DM push for webapp bookings (/webapp/booking-created) — no DB writes,
   no claim logic, since a webapp Booking's driver is already fixed.
2. A read/act bridge (/webapp/driver-orders*, /webapp/passenger-orders) so the webapp's
   existing driver page and trip history can show and act on bot orders for users who are
   registered in both systems (linked via User.telegramId). The claim/enroute/complete
   handlers call the exact same services.trips.perform_* functions the Telegram buttons call,
   so the two surfaces can never drift apart.
"""

import asyncio
import logging
import re
from datetime import datetime, timedelta

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiohttp import web
from sqlalchemy import delete, func, select

from app.config import settings
from app.data.regions import REGION_NAMES
from app.db.base import session_scope
from app.db.models import BotUser, DriverProfile, Group, GroupAd, Order, OrderDispatch
from app.handlers.admin.groups import SETTING_LABELS
from app.i18n.translations import t
from app.services import bot_config
from app.services import cargo as cargo_service
from app.services import drivers as drivers_service
from app.services import group_ads as group_ads_service
from app.services import groups as groups_service
from app.services import trips as trips_service
from app.services import users as users_service
from app.services.backend_client import backend_client
from app.services.driver_review import notify_rejected_driver, welcome_approved_driver
from app.services.phone import normalize_phone

logger = logging.getLogger(__name__)

routes = web.RouteTableDef()

_KIND_TO_KEY = {
    "new": "webapp_booking_new",
    "pending_timeout": "webapp_booking_pending_reminder",
    "start_timeout": "webapp_booking_start_reminder",
}


def _authorized(request: web.Request) -> bool:
    return request.headers.get("X-Bot-Secret") == settings.bot_api_secret


@routes.post("/webapp/booking-created")
async def booking_created(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    telegram_id = payload.get("telegramId")
    if not telegram_id:
        return web.json_response({"error": "telegramId required"}, status=400)

    lang = payload.get("language") or "uz"
    key = _KIND_TO_KEY.get(payload.get("kind", "new"), "webapp_booking_new")
    text = t(
        key,
        lang,
        rider_name=payload.get("riderName", ""),
        rider_phone=payload.get("riderPhone", ""),
        from_label=payload.get("fromLabel", ""),
        to_label=payload.get("toLabel", ""),
        depart_at=payload.get("departAt", ""),
        seats_summary=payload.get("seatsSummary", ""),
    )

    bot: Bot = request.app["bot"]
    try:
        await bot.send_message(int(telegram_id), text)
    except Exception:
        # Best-effort: server/ already recorded the in-app Notification, so a DM failure
        # (driver blocked the bot, bad telegramId, transient API error) must not surface as
        # an error to the caller — it would have no useful way to react to it anyway.
        logger.warning("Failed to DM driver %s about booking %s", telegram_id, payload.get("bookingId"))

    return web.json_response({"ok": True})


@routes.post("/webapp/offer-posted")
async def offer_posted(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    async with session_scope() as session:
        # A ROUTE group (one topic per direction, e.g. the Toshkent<->Andijon corridor) takes
        # priority over the generic per-region CLOSED group when this exact direction has a
        # topic registered for it.
        route_match = await groups_service.get_route_group_fuzzy(
            session, payload.get("fromRegion"), payload.get("toRegion")
        )
        if route_match is not None:
            group, route = route_match
            message_thread_id = route.get("message_thread_id")
        else:
            group = await groups_service.resolve_closed_dispatch_group(
                session, payload.get("fromRegion"), payload.get("toRegion")
            )
            message_thread_id = None

    if group is None:
        # No CLOSED driver group registered yet (not even a catch-all) — nothing to post to.
        return web.json_response({"ok": True, "posted": False})

    lang = group.language or "uz"
    text = t(
        "webapp_offer_posted",
        lang,
        driver_name=payload.get("driverName", ""),
        driver_phone=payload.get("driverPhone", ""),
        car_model=payload.get("carModel", ""),
        plate=payload.get("plate", ""),
        from_label=payload.get("fromLabel", ""),
        to_label=payload.get("toLabel", ""),
        depart_at=payload.get("departAt", ""),
        seats_total=payload.get("seatsTotal", ""),
        price=payload.get("pricePerSeat", ""),
    )

    bot: Bot = request.app["bot"]
    try:
        await bot.send_message(group.chat_id, text, message_thread_id=message_thread_id)
    except Exception:
        logger.warning("Failed to post offer %s to group %s", payload.get("offerId"), group.chat_id)
        return web.json_response({"ok": True, "posted": False})

    return web.json_response({"ok": True, "posted": True})


@routes.post("/webapp/cargo-posted")
async def cargo_posted(request: web.Request) -> web.Response:
    """A website cargo order: post it to its driver group(s) and to matching drivers' DMs, each
    with a "✅ Qabul qilish" button (services/cargo.py)."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    bot: Bot = request.app["bot"]
    async with session_scope() as session:
        reached = await cargo_service.dispatch(bot, session, payload)
    return web.json_response({"ok": True, "posted": bool(reached["groups"] or reached["drivers"]), **reached})


@routes.post("/webapp/cargo-status")
async def cargo_status(request: web.Request) -> web.Response:
    """A cargo order was taken / released / delivered / cancelled (website or bot) — relabel
    every Telegram copy so nobody acts on a stale card."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    status = payload.get("status")
    cargo_id = payload.get("cargoOrderId")
    if status not in ("NEW", "CLAIMED", "DELIVERED", "CANCELLED") or not cargo_id:
        return web.json_response({"error": "cargoOrderId and a valid status are required"}, status=400)

    skip = payload.get("driverTelegramId")
    bot: Bot = request.app["bot"]
    async with session_scope() as session:
        edited = await cargo_service.set_status(
            bot,
            session,
            str(cargo_id),
            status,
            driver_name=payload.get("driverName"),
            skip_chat_id=int(skip) if skip else None,
        )
    return web.json_response({"ok": True, "edited": edited})


@routes.post("/webapp/notify-user")
async def notify_user(request: web.Request) -> web.Response:
    """Plain text to one Telegram user (cargo updates for senders and drivers)."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    telegram_id = payload.get("telegramId")
    text = (payload.get("text") or "").strip()
    if not telegram_id or not text:
        return web.json_response({"error": "telegramId and text are required"}, status=400)

    bot: Bot = request.app["bot"]
    try:
        await bot.send_message(int(telegram_id), text[:4000])
    except (TelegramAPIError, ValueError):
        return web.json_response({"ok": True, "sent": False})
    return web.json_response({"ok": True, "sent": True})


@routes.post("/webapp/otp-code")
async def otp_code(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    telegram_id = payload.get("telegramId")
    phone = payload.get("phone")
    code = payload.get("code")
    if not telegram_id or not phone or not code:
        return web.json_response({"error": "telegramId, phone and code are required"}, status=400)

    lang = payload.get("language") or "uz"
    text = t("otp_code_message", lang, code=code)

    builder = InlineKeyboardBuilder()
    builder.button(text=t("otp_confirm_btn", lang), callback_data=f"otpconfirm:{phone}:{code}")

    bot: Bot = request.app["bot"]
    try:
        await bot.send_message(int(telegram_id), text, reply_markup=builder.as_markup())
    except Exception:
        # Best-effort: the SMS with the same code already went out, so a DM failure here just
        # means the user won't see the Telegram fast-path this one time.
        logger.warning("Failed to DM OTP code to telegram_id=%s", telegram_id)

    return web.json_response({"ok": True})


@routes.post("/webapp/driver-reviewed")
async def driver_reviewed(request: web.Request) -> web.Response:
    """An admin approved/rejected a driver application in the admin panel — mirror it onto the
    bot's DriverProfile and land the driver in the same place a Telegram-side review would."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    status = payload.get("status")
    if status not in ("APPROVED", "REJECTED"):
        return web.json_response({"error": "status must be APPROVED or REJECTED"}, status=400)
    reason = (payload.get("rejectionReason") or "").strip() or "-"

    bot: Bot = request.app["bot"]
    async with session_scope() as session:
        bot_user = None
        if payload.get("telegramId"):
            bot_user = await users_service.get_by_telegram_id(session, int(payload["telegramId"]))
        driver = await drivers_service.get_by_bot_user(session, bot_user.id) if bot_user else None
        if driver is None and payload.get("phone"):
            driver = await drivers_service.find_by_phone(session, normalize_phone(payload["phone"]) or payload["phone"])
        if driver is not None:
            driver = await drivers_service.get(session, driver.id)  # with bot_user loaded
            if payload.get("gender") in ("MALE", "FEMALE") and driver.gender != payload["gender"]:
                await drivers_service.update_gender(session, driver, payload["gender"])

        if driver is None:
            # Applied on the website only — no bot profile to flip, but still tell them on
            # Telegram if their account is linked.
            if bot_user is not None:
                lang = bot_user.language or "uz"
                text = (
                    t("driver_approved_dm", lang)
                    if status == "APPROVED"
                    else t("driver_rejected_dm", lang, reason=reason)
                )
                try:
                    await bot.send_message(bot_user.telegram_id, text)
                except TelegramAPIError:
                    pass
            return web.json_response({"ok": True, "driverProfile": False})

        if status == "APPROVED":
            if driver.status != "APPROVED":
                await drivers_service.approve_application(session, driver)
                warning = await welcome_approved_driver(bot, session, driver)
                if warning:
                    logger.warning("driver %s approved from admin panel: %s", driver.id, warning)
        elif driver.status != "REJECTED":
            await drivers_service.reject(session, driver, reason)
            await notify_rejected_driver(bot, driver.bot_user.telegram_id, driver.language, reason)

    return web.json_response({"ok": True, "driverProfile": True})


async def _find_driver_profile(session, payload: dict):
    """The bot DriverProfile behind a server user: by Telegram id first, then by phone."""
    bot_user = None
    if payload.get("telegramId"):
        bot_user = await users_service.get_by_telegram_id(session, int(payload["telegramId"]))
    driver = await drivers_service.get_by_bot_user(session, bot_user.id) if bot_user else None
    if driver is None and payload.get("phone"):
        driver = await drivers_service.find_by_phone(session, normalize_phone(payload["phone"]) or payload["phone"])
    return driver


@routes.post("/webapp/driver-blocked")
async def driver_blocked(request: web.Request) -> web.Response:
    """An admin/operator (un)blocked a driver application in the admin panel."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    if not isinstance(payload.get("blocked"), bool):
        return web.json_response({"error": "blocked must be a boolean"}, status=400)

    async with session_scope() as session:
        driver = await _find_driver_profile(session, payload)
        if driver is None:
            return web.json_response({"ok": True, "driverProfile": False})
        if driver.blocked != payload["blocked"]:
            await drivers_service.set_blocked(session, driver, payload["blocked"])
    return web.json_response({"ok": True, "driverProfile": True})


@routes.post("/webapp/driver-update")
async def driver_update(request: web.Request) -> web.Response:
    """An admin/operator corrected a driver application's details in the admin panel."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    async with session_scope() as session:
        driver = await _find_driver_profile(session, payload)
        if driver is None:
            return web.json_response({"ok": True, "driverProfile": False})
        await drivers_service.update_from_panel(
            session,
            driver,
            full_name=(payload.get("fullName") or "").strip() or None,
            car_model=(payload.get("carModel") or "").strip() or None,
            plate=(payload.get("plate") or "").strip() or None,
            region=(payload.get("region") or "").strip() or None,
            to_region=payload.get("toRegion") if "toRegion" in payload else None,
        )
        if payload.get("gender") in ("MALE", "FEMALE") and driver.gender != payload["gender"]:
            await drivers_service.update_gender(session, driver, payload["gender"])
    return web.json_response({"ok": True, "driverProfile": True})


def _serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "passengerName": order.passenger_name,
        "passengerPhone": order.passenger_phone,
        "fromRegion": order.from_region,
        "fromDistrict": order.from_district,
        "toRegion": order.to_region,
        "toDistrict": order.to_district,
        "carBrand": order.car_brand,
        "seat": order.seat,
        "passengers": order.passengers,
        "luggageSize": order.luggage_size,
        "whenText": order.when_text,
        "status": order.status,
        "source": order.source,
        "womenOnly": bool(order.women_only),
        # Still in the female-drivers-first window (see trips.WOMEN_FIRST_MINUTES).
        "femaleOnly": trips_service.is_female_only(order),
        "passengerGender": order.passenger_gender,
        "contactNote": order.contact_note,
        "createdAt": order.created_at.isoformat() + "Z",
        "pickupLat": order.pickup_lat,
        "pickupLng": order.pickup_lng,
        "pickupText": order.pickup_text,
        "confirmed": order.confirmed_at is not None,
    }


async def _resolve_active_driver(session, telegram_id: str) -> DriverProfile | None:
    bot_user = await users_service.get_by_telegram_id(session, int(telegram_id))
    if bot_user is None:
        return None
    driver = await drivers_service.get_by_bot_user(session, bot_user.id)
    if driver is None or driver.status != "APPROVED" or driver.blocked:
        return None
    return driver


# Website search form values → the bot's own codes (see keyboards/trip.py).
_WEB_SEATS = {"old": "front", "orqa-ong": "rear_right", "orqa-chap": "rear_left", "orqa-orta": "rear_middle"}
_WEB_LUGGAGE = {"kichik": "S", "o'rta": "M", "o‘rta": "M", "katta": "L", "s": "S", "m": "M", "l": "L"}
# Website "Kim boradi" values → Order.passenger_gender.
_WEB_GENDER = {"erkak": "MALE", "ayol": "FEMALE", "juft": "COUPLE", "male": "MALE", "female": "FEMALE", "couple": "COUPLE"}


@routes.post("/webapp/driver-gender")
async def driver_gender(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    gender = payload.get("gender")
    if gender not in ("MALE", "FEMALE", None):
        return web.json_response({"error": "gender must be MALE, FEMALE or null"}, status=400)

    async with session_scope() as session:
        driver = None
        if payload.get("telegramId"):
            bot_user = await users_service.get_by_telegram_id(session, int(payload["telegramId"]))
            driver = await drivers_service.get_by_bot_user(session, bot_user.id) if bot_user else None
        if driver is None and payload.get("phone"):
            driver = await drivers_service.find_by_phone(session, normalize_phone(payload["phone"]) or payload["phone"])
        if driver is None:
            return web.json_response({"ok": True, "driverProfile": False})
        await drivers_service.update_gender(session, driver, gender)
        return web.json_response({"ok": True, "driverProfile": True})


@routes.post("/webapp/passenger-orders")
async def passenger_order_create(request: web.Request) -> web.Response:
    """A passenger looking for a car on the website: becomes a normal bot Order, dispatched to
    the same driver groups / driver DMs as a Telegram order, and shows up in the website's
    driver section. Identity is the passenger's linked Telegram account."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    telegram_id = payload.get("telegramId")
    from_region = (payload.get("fromRegion") or "").strip()
    to_region = (payload.get("toRegion") or "").strip()
    if not telegram_id or not from_region or not to_region:
        return web.json_response({"error": "telegramId, fromRegion and toRegion are required"}, status=400)
    try:
        passengers = max(1, min(int(payload.get("passengers") or 1), 8))
    except (TypeError, ValueError):
        passengers = 1

    bot: Bot = request.app["bot"]
    async with session_scope() as session:
        bot_user = await users_service.get_by_telegram_id(session, int(telegram_id))
        if bot_user is None:
            return web.json_response({"error": "bot_user_not_found"}, status=404)

        note_parts = []
        women_only = bool(payload.get("womenOnly"))
        passenger_gender = "FEMALE" if women_only else _WEB_GENDER.get(str(payload.get("gender") or "").lower())
        if payload.get("note"):
            note_parts.append(str(payload["note"]).strip()[:300])

        order = await trips_service.create_order(
            session,
            bot_user,
            {
                "passenger_name": (payload.get("name") or bot_user.name or "Yo'lovchi").strip()[:120],
                "passenger_phone": payload.get("phone") or bot_user.phone or "",
                "for_someone_else": False,
                "contact_note": " · ".join(note_parts) or None,
                "pickup_text": (payload.get("pickupText") or "").strip()[:200] or None,
                "from_region": groups_service.canonical_region(from_region, REGION_NAMES),
                "from_district": (payload.get("fromDistrict") or "").strip()[:120] or "-",
                "to_region": groups_service.canonical_region(to_region, REGION_NAMES),
                "to_district": (payload.get("toDistrict") or "").strip()[:120] or "-",
                "car_brand": (payload.get("carBrand") or "").strip()[:60] or "Farqi yo'q",
                "seat": _WEB_SEATS.get(str(payload.get("seat") or ""), "any"),
                "passengers": passengers,
                "luggage_size": _WEB_LUGGAGE.get(str(payload.get("luggage") or "").lower(), "M"),
                "when_text": (payload.get("whenText") or "").strip()[:60] or "Kelishiladi",
                "women_only": women_only,
                "passenger_gender": passenger_gender,
                "source": "WEBAPP",
            },
        )
        sent = await trips_service.dispatch_order(bot, session, order)

        lang = bot_user.language or "uz"
        created_key = trips_service.created_message_key(order)
        try:
            await bot.send_message(bot_user.telegram_id, t(created_key if sent else "no_group_for_region", lang))
        except TelegramAPIError:
            pass

        return web.json_response({"order": _serialize_order(order), "sent": sent}, status=201)


@routes.get("/webapp/driver-orders")
async def driver_orders(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    telegram_id = request.query.get("telegramId")
    if not telegram_id:
        return web.json_response({"error": "telegramId required"}, status=400)

    async with session_scope() as session:
        driver = await _resolve_active_driver(session, telegram_id)
        if driver is None:
            return web.json_response({"registered": False})

        open_result = await session.execute(
            select(Order).where(Order.status == "OPEN").order_by(Order.created_at.desc())
        )
        open_orders = [
            _serialize_order(o)
            for o in open_result.scalars()
            if groups_service.driver_serves(driver, o.from_region, o.to_region) and trips_service.driver_can_see(driver, o)
        ]

        claimed_result = await session.execute(
            select(Order).where(Order.assigned_driver_id == driver.id, Order.status == "CLAIMED")
        )
        claimed_order = claimed_result.scalar_one_or_none()

        return web.json_response(
            {
                "registered": True,
                "region": driver.region,
                "gender": driver.gender,
                "openOrders": open_orders,
                "claimedOrder": _serialize_order(claimed_order) if claimed_order else None,
            }
        )


async def _driver_order_action(request: web.Request, perform) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    telegram_id = payload.get("telegramId")
    if not telegram_id:
        return web.json_response({"error": "telegramId required"}, status=400)

    bot: Bot = request.app["bot"]

    async with session_scope() as session:
        driver = await _resolve_active_driver(session, telegram_id)
        if driver is None:
            return web.json_response({"error": "not_a_driver"}, status=403)

        return await perform(bot, session, order_id, driver)


@routes.post("/webapp/driver-orders/{order_id}/claim")
async def driver_order_claim(request: web.Request) -> web.Response:
    async def perform(bot, session, order_id, driver):
        target = await session.get(Order, order_id)
        denied = trips_service.claim_denied_key(driver, target) if target is not None else None
        if denied:
            return web.json_response({"error": t(denied, driver.language)}, status=403)
        order = await trips_service.perform_claim(bot, session, order_id, driver)
        if order is None:
            return web.json_response({"error": "already_claimed"}, status=409)
        return web.json_response({"order": _serialize_order(order)})

    return await _driver_order_action(request, perform)


@routes.post("/webapp/driver-orders/{order_id}/enroute")
async def driver_order_enroute(request: web.Request) -> web.Response:
    async def perform(bot, session, order_id, driver):
        ok = await trips_service.perform_enroute(bot, session, order_id, driver)
        if not ok:
            return web.json_response({"error": "invalid_state"}, status=409)
        return web.json_response({"ok": True})

    return await _driver_order_action(request, perform)


@routes.post("/webapp/driver-orders/{order_id}/complete")
async def driver_order_complete(request: web.Request) -> web.Response:
    async def perform(bot, session, order_id, driver):
        ok = await trips_service.perform_complete(bot, session, order_id, driver)
        if not ok:
            return web.json_response({"error": "invalid_state"}, status=409)
        return web.json_response({"ok": True})

    return await _driver_order_action(request, perform)


@routes.post("/webapp/driver-orders/{order_id}/cancel")
async def driver_order_cancel(request: web.Request) -> web.Response:
    async def perform(bot, session, order_id, driver):
        order = await trips_service.perform_cancel_claim(bot, session, order_id, driver)
        if order is None:
            return web.json_response({"error": "invalid_state"}, status=409)
        return web.json_response({"ok": True})

    return await _driver_order_action(request, perform)


@routes.post("/webapp/passenger-orders/{order_id}/rate")
async def passenger_order_rate(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    telegram_id = payload.get("telegramId")
    stars = payload.get("stars")
    if not telegram_id or not isinstance(stars, int) or not 1 <= stars <= 5:
        return web.json_response({"error": "telegramId and stars(1-5) required"}, status=400)

    async with session_scope() as session:
        bot_user = await users_service.get_by_telegram_id(session, int(telegram_id))
        if bot_user is None:
            return web.json_response({"error": "not_found"}, status=404)

        order = await session.get(Order, order_id)
        if order is None or order.bot_user_id != bot_user.id or order.status != "COMPLETED":
            return web.json_response({"error": "invalid_state"}, status=409)

        driver = await session.get(DriverProfile, order.assigned_driver_id) if order.assigned_driver_id else None
        driver_bot_user = await session.get(BotUser, driver.bot_user_id) if driver else None
        if driver_bot_user is None:
            return web.json_response({"error": "invalid_state"}, status=409)

        ok = await backend_client.submit_rating(
            rater_telegram_id=bot_user.telegram_id,
            ratee_telegram_id=driver_bot_user.telegram_id,
            trip_ref=f"bot:{order_id}",
            direction="PASSENGER_RATES_DRIVER",
            stars=stars,
            tags=payload.get("tags"),
            comment=payload.get("comment"),
        )
        if not ok:
            return web.json_response({"error": "rating_failed"}, status=502)
        return web.json_response({"ok": True})


@routes.get("/webapp/passenger-orders")
async def passenger_orders(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    telegram_id = request.query.get("telegramId")
    if not telegram_id:
        return web.json_response({"error": "telegramId required"}, status=400)

    async with session_scope() as session:
        bot_user = await users_service.get_by_telegram_id(session, int(telegram_id))
        if bot_user is None:
            return web.json_response({"orders": []})
        orders = await trips_service.list_my_trips(session, bot_user, limit=20)
        return web.json_response({"orders": [_serialize_order(o) for o in orders]})


def _serialize_admin_order(order: Order, driver: DriverProfile | None, dispatch_count: int) -> dict:
    data = _serialize_order(order)
    data["assignedDriver"] = (
        {"name": driver.full_name, "phone": driver.phone, "gender": driver.gender} if driver else None
    )
    data["dispatchCount"] = dispatch_count
    return data


async def _load_admin_order(session, order_id: int) -> tuple[Order, DriverProfile | None, int] | None:
    order = await session.get(Order, order_id)
    if order is None:
        return None
    driver = await session.get(DriverProfile, order.assigned_driver_id) if order.assigned_driver_id else None
    dispatch_count = (
        await session.scalar(select(func.count()).select_from(OrderDispatch).where(OrderDispatch.order_id == order_id))
        or 0
    )
    return order, driver, dispatch_count


@routes.get("/webapp/admin/orders")
async def admin_list_orders(request: web.Request) -> web.Response:
    """Everything a passenger has ever posted through the bot, for the web admin panel's
    "Elonlar" page — the counterpart to the RideOffer list Node already serves for driver-
    posted listings. Not scoped to any one telegramId, unlike every other handler here."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    status = request.query.get("status")
    q = request.query.get("q")
    # "Ayol yo'lovchilar" in the admin panel: women-only orders plus any order where a woman travels.
    women = request.query.get("women") in ("1", "true")

    async with session_scope() as session:
        stmt = select(Order).order_by(Order.created_at.desc()).limit(200)
        if status:
            stmt = stmt.where(Order.status == status)
        if women:
            stmt = stmt.where(Order.women_only.is_(True) | (Order.passenger_gender == "FEMALE"))
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                (Order.passenger_name.ilike(like))
                | (Order.passenger_phone.ilike(like))
                | (Order.from_region.ilike(like))
                | (Order.to_region.ilike(like))
            )
        result = await session.execute(stmt)
        orders = list(result.scalars())
        if not orders:
            return web.json_response({"orders": []})

        driver_ids = {o.assigned_driver_id for o in orders if o.assigned_driver_id}
        drivers: dict[int, DriverProfile] = {}
        if driver_ids:
            driver_result = await session.execute(select(DriverProfile).where(DriverProfile.id.in_(driver_ids)))
            drivers = {d.id: d for d in driver_result.scalars()}

        dispatch_result = await session.execute(
            select(OrderDispatch.order_id, func.count())
            .where(OrderDispatch.order_id.in_([o.id for o in orders]))
            .group_by(OrderDispatch.order_id)
        )
        dispatch_counts = dict(dispatch_result.all())

        return web.json_response(
            {
                "orders": [
                    _serialize_admin_order(
                        o,
                        drivers.get(o.assigned_driver_id) if o.assigned_driver_id else None,
                        dispatch_counts.get(o.id, 0),
                    )
                    for o in orders
                ]
            }
        )


@routes.get("/webapp/admin/orders/{order_id}")
async def admin_get_order(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    async with session_scope() as session:
        loaded = await _load_admin_order(session, order_id)
        if loaded is None:
            return web.json_response({"error": "not_found"}, status=404)
        order, driver, dispatch_count = loaded
        return web.json_response({"order": _serialize_admin_order(order, driver, dispatch_count)})


_ADMIN_ORDER_FIELD_MAP = {
    "passengerName": "passenger_name",
    "passengerPhone": "passenger_phone",
    "fromRegion": "from_region",
    "fromDistrict": "from_district",
    "toRegion": "to_region",
    "toDistrict": "to_district",
    "carBrand": "car_brand",
    "seat": "seat",
    "passengers": "passengers",
    "luggageSize": "luggage_size",
    "whenText": "when_text",
    "pickupLat": "pickup_lat",
    "pickupLng": "pickup_lng",
    "pickupText": "pickup_text",
}


@routes.patch("/webapp/admin/orders/{order_id}")
async def admin_update_order(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    bot: Bot = request.app["bot"]

    async with session_scope() as session:
        order = await session.get(Order, order_id)
        if order is None:
            return web.json_response({"error": "not_found"}, status=404)
        # Once claimed, the driver's own dispatch copy carries a distinct "you claimed this"
        # view that rerender_dispatches below doesn't know how to reproduce — same restriction
        # as the Node side's RideOffer admin edit, which blocks once any seat is taken.
        if order.status != "OPEN":
            return web.json_response({"error": "invalid_state"}, status=409)

        for key, column in _ADMIN_ORDER_FIELD_MAP.items():
            if key in payload:
                setattr(order, column, payload[key])
        await session.commit()

        # Push the edit out to every group/DM this order was already posted to, so the admin
        # panel's "edit" doesn't silently drift from what drivers are looking at in Telegram.
        await trips_service.rerender_dispatches(bot, session, order)

        loaded = await _load_admin_order(session, order_id)
        order, driver, dispatch_count = loaded
        return web.json_response({"order": _serialize_admin_order(order, driver, dispatch_count)})


@routes.patch("/webapp/admin/orders/{order_id}/status")
async def admin_set_order_status(request: web.Request) -> web.Response:
    """Publish (OPEN) / unpublish (CLOSED) / soft-cancel (CANCELLED) an order. Distinct from
    DELETE below: this keeps the Order row and its dispatched messages, just edits the
    messages to a closed/cancelled label with no claim button — DELETE removes it entirely."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    status = payload.get("status")
    if status not in ("OPEN", "CLOSED", "CANCELLED"):
        return web.json_response({"error": "invalid status"}, status=400)

    bot: Bot = request.app["bot"]

    async with session_scope() as session:
        order = await session.get(Order, order_id)
        if order is None:
            return web.json_response({"error": "not_found"}, status=404)
        if order.status in ("CLAIMED", "COMPLETED"):
            return web.json_response({"error": "invalid_state"}, status=409)

        order.status = status
        # Reopening clears it; closing/cancelling stamps when it left the pipeline.
        order.finished_at = None if status == "OPEN" else datetime.utcnow()
        await session.commit()

        closed_label_key = "order_cancelled_by_admin_label" if status == "CANCELLED" else "order_closed_by_admin_label"
        await trips_service.rerender_dispatches(bot, session, order, closed_label_key=closed_label_key)

        loaded = await _load_admin_order(session, order_id)
        order, driver, dispatch_count = loaded
        return web.json_response({"order": _serialize_admin_order(order, driver, dispatch_count)})


@routes.delete("/webapp/admin/orders/{order_id}")
async def admin_delete_order(request: web.Request) -> web.Response:
    """Hard delete: removes every Telegram message this order was dispatched as, then the
    Order row itself (cascades OrderDispatch too) — the order vanishes everywhere it was ever
    shown, not just from the admin panel."""
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        order_id = int(request.match_info["order_id"])
    except ValueError:
        return web.json_response({"error": "invalid order id"}, status=400)

    bot: Bot = request.app["bot"]

    async with session_scope() as session:
        order = await session.get(Order, order_id)
        if order is None:
            return web.json_response({"ok": True})

        try:
            await trips_service.delete_all_dispatches(bot, session, order)
        except Exception:
            logger.exception("Failed to delete Telegram dispatches for order %s", order_id)

        session.expunge_all()
        try:
            await session.execute(delete(OrderDispatch).where(OrderDispatch.order_id == order_id))
            await session.execute(delete(Order).where(Order.id == order_id))
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("Failed to delete order %s", order_id)
            return web.json_response({"error": "delete_failed"}, status=500)

        return web.json_response({"ok": True})


_CHAT_RESOLVE_HINT = (
    "Bu chat topilmadi. Botni guruh yoki kanalga admin qilib qo‘shing, keyin ID, @username yoki t.me havolasini qayta yuboring."
)


async def _resolve_chat(bot: Bot, raw: str) -> dict:
    try:
        parsed = groups_service.parse_telegram_ref(raw)
    except ValueError:
        raise ValueError("ID, @username yoki t.me havolasini kiriting") from None

    try:
        if "chat_id" in parsed:
            chat = await bot.get_chat(parsed["chat_id"])
        elif "username" in parsed:
            chat = await bot.get_chat(parsed["username"])
        else:
            chat = await bot.get_chat(parsed["invite"])
    except TelegramAPIError as exc:
        raise ValueError(_CHAT_RESOLVE_HINT) from exc

    title = getattr(chat, "title", None) or getattr(chat, "full_name", None)
    username = f"@{chat.username}" if getattr(chat, "username", None) else None
    invite = getattr(chat, "invite_link", None)
    return {
        "chat_id": chat.id,
        "title": title,
        "username": username,
        "invite_link": invite,
        "thread_id": parsed.get("thread_id"),
    }


def _topic_from_payload(item: dict) -> dict:
    from_region = item.get("fromRegion") or item.get("from_region")
    to_region = item.get("toRegion") or item.get("to_region")
    thread_id = item.get("threadId") if "threadId" in item else item.get("message_thread_id")
    label = item.get("label")
    return {
        "from_region": from_region,
        "to_region": to_region,
        "message_thread_id": thread_id,
        "label": label,
    }


async def _resolve_topics(bot: Bot, parent_chat_id: int, topics: list | None) -> list[dict]:
    routes: list[dict] = []
    for item in topics or []:
        route = _topic_from_payload(item)
        if not route["from_region"] or not route["to_region"]:
            raise ValueError("Har bir ichki chat uchun qayerdan va qayerga viloyatni tanlang")
        ref = item.get("ref")
        if ref:
            text = str(ref).strip()
            if re.fullmatch(r"\d+", text):
                route["message_thread_id"] = int(text)
            else:
                resolved = await _resolve_chat(bot, text)
                if resolved["chat_id"] != parent_chat_id and resolved["thread_id"] is None:
                    raise ValueError("Ichki chat havolasi shu forum-guruhning topic’iga tegishli bo‘lishi kerak")
                route["message_thread_id"] = resolved["thread_id"]
                if not route.get("label"):
                    route["label"] = resolved["title"]
        elif route["message_thread_id"] is not None:
            try:
                route["message_thread_id"] = int(route["message_thread_id"])
            except (TypeError, ValueError) as exc:
                raise ValueError("Topic ID raqam bo‘lishi kerak") from exc
        routes.append(route)
    return routes


async def _settings_patch(session, payload: dict, group_id: int | None) -> dict:
    """Group-services toggles (`settings: {anti_spam: true, …}`) and `linkedGroupId` from an
    admin-dashboard create/update payload, validated into Group.settings keys."""
    patch: dict = {}
    toggles = payload.get("settings")
    if isinstance(toggles, dict):
        for key, value in toggles.items():
            if key in SETTING_LABELS and isinstance(value, bool):
                patch[key] = value
    if "linkedGroupId" in payload:
        linked = payload.get("linkedGroupId")
        if linked in (None, "", 0):
            patch["linked_group_id"] = None
        else:
            try:
                linked = int(linked)
            except (TypeError, ValueError) as exc:
                raise ValueError("Biriktiriladigan guruh noto‘g‘ri") from exc
            target = await session.get(Group, linked)
            if target is None or target.kind not in ("CLOSED", "ROUTE") or target.id == group_id:
                raise ValueError("Faqat yopiq haydovchilar guruhiga biriktirish mumkin")
            patch["linked_group_id"] = target.id
    return patch


@routes.get("/webapp/admin/groups")
async def admin_list_groups(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)

    kind = request.query.get("kind")
    async with session_scope() as session:
        groups = await groups_service.list_groups(session, kind)
        return web.json_response(
            {
                "groups": [groups_service.serialize_group(g) for g in groups],
                "regions": REGION_NAMES,
                "settingLabels": SETTING_LABELS,
            }
        )


@routes.post("/webapp/admin/groups")
async def admin_create_group(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    kind = payload.get("kind")
    ref = (payload.get("ref") or "").strip()
    if kind not in ("CLOSED", "ROUTE", "CHANNEL", "MAIN"):
        return web.json_response({"error": "kind CLOSED, ROUTE, MAIN yoki CHANNEL bo‘lishi kerak"}, status=400)
    if not ref:
        return web.json_response({"error": "Guruh yoki kanal ID / havolasini kiriting"}, status=400)

    bot: Bot = request.app["bot"]
    try:
        resolved = await _resolve_chat(bot, ref)
    except ValueError as exc:
        return web.json_response({"error": str(exc)}, status=400)

    title = (payload.get("title") or "").strip() or resolved["title"]
    from_region = payload.get("fromRegion") or payload.get("from_region")
    to_region = payload.get("toRegion") or payload.get("to_region")
    include_reverse = payload.get("includeReverse", True)
    extra_settings = {}
    if resolved["username"]:
        extra_settings["username"] = resolved["username"]
    if resolved["invite_link"]:
        extra_settings["invite_link"] = resolved["invite_link"]

    routes = None
    region = None

    if kind == "CLOSED":
        if not from_region or not to_region:
            return web.json_response({"error": "Yopiq guruh uchun qayerdan va qayerga viloyatni tanlang"}, status=400)
        title = title or groups_service.corridor_title(from_region, to_region)
        region = from_region
        routes = groups_service.build_closed_routes(from_region, to_region, bool(include_reverse))
    elif kind == "ROUTE":
        if from_region and to_region and not title:
            title = groups_service.corridor_title(from_region, to_region)
        try:
            routes = await _resolve_topics(bot, resolved["chat_id"], payload.get("topics"))
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        if from_region:
            region = from_region
    elif kind == "MAIN":
        region = from_region or None
    else:
        if not (payload.get("title") or "").strip():
            return web.json_response({"error": "Kanalga nom qo‘ying — keyin adashib ketmaslik uchun"}, status=400)
        title = payload["title"].strip()

    async with session_scope() as session:
        if kind == "MAIN":
            try:
                extra_settings.update(await _settings_patch(session, payload, None))
            except ValueError as exc:
                return web.json_response({"error": str(exc)}, status=400)
        group = await groups_service.register_group(
            session,
            chat_id=resolved["chat_id"],
            title=title,
            kind=kind,
            region=region,
            added_by_telegram_id=0,
            routes=routes,
            extra_settings=extra_settings or None,
        )
        return web.json_response({"group": groups_service.serialize_group(group)})


@routes.patch("/webapp/admin/groups/{group_id}")
async def admin_update_group(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        group_id = int(request.match_info["group_id"])
    except ValueError:
        return web.json_response({"error": "invalid group id"}, status=400)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    bot: Bot = request.app["bot"]
    extra_settings = None
    chat_id = None
    resolved = None
    ref = (payload.get("ref") or "").strip()
    if ref:
        try:
            resolved = await _resolve_chat(bot, ref)
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        chat_id = resolved["chat_id"]
        extra_settings = {}
        if resolved["username"]:
            extra_settings["username"] = resolved["username"]
        if resolved["invite_link"]:
            extra_settings["invite_link"] = resolved["invite_link"]

    async with session_scope() as session:
        group = await session.get(Group, group_id)
        if group is None:
            return web.json_response({"error": "not_found"}, status=404)

        kind = payload.get("kind") or group.kind
        title = payload["title"].strip() if isinstance(payload.get("title"), str) else None
        from_region = payload.get("fromRegion") or payload.get("from_region")
        to_region = payload.get("toRegion") or payload.get("to_region")
        include_reverse = payload.get("includeReverse")
        routes = None
        region = None

        parent_chat_id = chat_id if chat_id is not None else group.chat_id

        if kind == "CLOSED" and from_region and to_region:
            region = from_region
            routes = groups_service.build_closed_routes(
                from_region,
                to_region,
                True if include_reverse is None else bool(include_reverse),
            )
            if title is None and not group.title:
                title = groups_service.corridor_title(from_region, to_region)
        elif kind == "ROUTE" and "topics" in payload:
            try:
                routes = await _resolve_topics(bot, parent_chat_id, payload.get("topics"))
            except ValueError as exc:
                return web.json_response({"error": str(exc)}, status=400)
            if from_region:
                region = from_region
        elif kind == "CHANNEL" and title is not None and len(title) < 1:
            return web.json_response({"error": "Kanalga nom qo‘ying"}, status=400)

        try:
            settings_patch = await _settings_patch(session, payload, group.id)
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        if settings_patch:
            extra_settings = {**(extra_settings or {}), **settings_patch}

        if chat_id is not None and chat_id != group.chat_id:
            clash = await groups_service.get_by_chat_id(session, chat_id)
            if clash is not None and clash.id != group.id:
                return web.json_response({"error": "Bu chat allaqachon boshqa yozuvga biriktirilgan"}, status=409)

        group = await groups_service.update_group(
            session,
            group,
            title=title,
            kind=kind if payload.get("kind") else None,
            region=region,
            chat_id=chat_id,
            routes=routes,
            extra_settings=extra_settings,
        )
        return web.json_response({"group": groups_service.serialize_group(group)})


@routes.delete("/webapp/admin/groups/{group_id}")
async def admin_delete_group(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        group_id = int(request.match_info["group_id"])
    except ValueError:
        return web.json_response({"error": "invalid group id"}, status=400)

    async with session_scope() as session:
        group = await session.get(Group, group_id)
        if group is None:
            return web.json_response({"ok": True})
        await groups_service.remove_group(session, group)
        return web.json_response({"ok": True})


# ── Bot sozlamalari (runtime settings) and the group-ads log ─────────────────────────────────


@routes.get("/webapp/admin/bot-settings")
async def admin_get_bot_settings(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    return web.json_response(bot_config.describe())


@routes.patch("/webapp/admin/bot-settings")
async def admin_update_bot_settings(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    values = payload.get("values")
    if not isinstance(values, dict) or not values:
        return web.json_response({"error": "values bo‘sh"}, status=400)
    async with session_scope() as session:
        try:
            await bot_config.update(session, values)
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
    return web.json_response(bot_config.describe())


@routes.get("/webapp/admin/group-ads")
async def admin_group_ads(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    status = request.query.get("status") or None
    try:
        limit = int(request.query.get("limit", "100"))
    except ValueError:
        limit = 100
    async with session_scope() as session:
        ads = await group_ads_service.list_recent(session, status=status, limit=limit)
        stats = await group_ads_service.stats(session, datetime.utcnow() - timedelta(hours=24))
        titles = {
            str(g.chat_id): g.title
            for g in (await session.execute(select(Group).where(Group.kind.in_(("MAIN", "CLOSED", "ROUTE"))))).scalars()
        }
    return web.json_response(
        {"ads": [group_ads_service.serialize(a) for a in ads], "stats24h": stats, "chatTitles": titles}
    )


async def _admin_ad(request: web.Request, session):
    try:
        ad_id = int(request.match_info["ad_id"])
    except ValueError:
        return None
    return await session.get(GroupAd, ad_id)


@routes.post("/webapp/admin/group-ads")
async def admin_create_group_ad(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    text = (payload.get("text") or "").strip()
    if not text:
        return web.json_response({"error": "E’lon matnini kiriting"}, status=400)
    async with session_scope() as session:
        try:
            target = await session.get(Group, int(payload.get("targetGroupId") or 0))
        except (TypeError, ValueError):
            target = None
        if target is None or target.kind not in ("CLOSED", "ROUTE"):
            return web.json_response({"error": "Haydovchilar guruhini tanlang"}, status=400)
        try:
            ad = await group_ads_service.admin_create(request.app["bot"], session, target, text, payload.get("authorName"))
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        return web.json_response({"ad": group_ads_service.serialize(ad)})


@routes.patch("/webapp/admin/group-ads/{ad_id}")
async def admin_update_group_ad(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)
    async with session_scope() as session:
        ad = await _admin_ad(request, session)
        if ad is None:
            return web.json_response({"error": "E’lon topilmadi"}, status=404)
        try:
            ad = await group_ads_service.admin_update(
                request.app["bot"], session, ad, text=payload.get("text"), status=payload.get("status")
            )
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        return web.json_response({"ad": group_ads_service.serialize(ad)})


@routes.delete("/webapp/admin/group-ads/{ad_id}")
async def admin_delete_group_ad(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    async with session_scope() as session:
        ad = await _admin_ad(request, session)
        if ad is not None:
            await group_ads_service.admin_delete(request.app["bot"], session, ad)
    return web.json_response({"ok": True})


# ── Random mijoz: kanal/guruh a'zoligini ommaviy tekshirish ─────────────────────────────────
# server/ sends {chats: ["@channel", "-100…"], telegramIds: ["123", …]} and gets back
# {members: {tgId: {chat: bool}}, chatErrors: {chat: reason}}. A chat-level failure (wrong id,
# bot not an admin of the channel) is reported once per chat instead of marking everyone as
# "not subscribed", so the admin sees the real cause.
_MEMBER_STATUSES = {"member", "administrator", "creator"}
_CHAT_LEVEL_ERRORS = ("chat not found", "member list is inaccessible", "not enough rights", "bot is not a member", "chat_admin_required")


def _is_member(member) -> bool:
    if member.status in _MEMBER_STATUSES:
        return True
    if member.status == "restricted":
        return bool(getattr(member, "is_member", False))
    return False


@routes.post("/webapp/chat-members")
async def chat_members(request: web.Request) -> web.Response:
    if not _authorized(request):
        return web.json_response({"error": "unauthorized"}, status=401)
    try:
        payload = await request.json()
    except ValueError:
        return web.json_response({"error": "invalid json"}, status=400)

    chats = [str(c) for c in (payload.get("chats") or []) if c][:5]
    telegram_ids = [str(i) for i in (payload.get("telegramIds") or []) if str(i).isdigit()][:200]
    bot: Bot = request.app["bot"]
    members: dict[str, dict[str, bool]] = {tg: {} for tg in telegram_ids}
    chat_errors: dict[str, str] = {}

    for chat in chats:
        chat_ref = int(chat) if chat.lstrip("-").isdigit() else chat
        try:
            await bot.get_chat(chat_ref)
        except TelegramAPIError as exc:
            chat_errors[chat] = str(exc.message if hasattr(exc, "message") else exc)
            continue

        sem = asyncio.Semaphore(15)

        async def check(tg: str, chat=chat, chat_ref=chat_ref) -> None:
            if chat in chat_errors:
                return
            async with sem:
                try:
                    member = await bot.get_chat_member(chat_ref, int(tg))
                    members[tg][chat] = _is_member(member)
                except TelegramAPIError as exc:
                    reason = str(getattr(exc, "message", exc))
                    if any(marker in reason.lower() for marker in _CHAT_LEVEL_ERRORS):
                        chat_errors[chat] = reason
                    else:
                        # "user not found" / "participant_id_invalid" — never joined.
                        members[tg][chat] = False

        await asyncio.gather(*(check(tg) for tg in telegram_ids))

    return web.json_response({"members": members, "chatErrors": chat_errors})


def build_app(bot: Bot) -> web.Application:
    app = web.Application()
    app["bot"] = bot
    app.add_routes(routes)
    return app


async def run_webserver(bot: Bot, port: int) -> web.AppRunner:
    app = build_app(bot)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info("taxiline-bot webhook server listening on :%s", port)
    return runner
