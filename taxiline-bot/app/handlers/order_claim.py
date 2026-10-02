from aiogram import F, Router
from aiogram.types import CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Order
from app.i18n.translations import t
from app.keyboards.trip import order_complete_kb, order_enroute_kb
from app.services import drivers as drivers_service
from app.services import trips as trips_service

router = Router(name="order_claim")


async def _get_approved_driver(session, bot_user):
    if bot_user is None:
        return None
    driver = await drivers_service.get_by_bot_user(session, bot_user.id)
    if driver is None or driver.status != "APPROVED" or driver.blocked:
        return None
    return driver


@router.callback_query(F.data.startswith("order:claim:"))
async def claim(callback: CallbackQuery, session, bot_user) -> None:
    order_id = int(callback.data.split(":")[-1])

    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await callback.answer("Bu amal faqat tasdiqlangan haydovchilar uchun.", show_alert=True)
        return

    dispatch = await trips_service.get_dispatch_by_message(
        session, order_id, callback.message.chat.id, callback.message.message_id
    )
    order = await trips_service.perform_claim(
        callback.bot, session, order_id, driver, except_dispatch_id=dispatch.id if dispatch else None
    )
    if order is None:
        await callback.answer(t("order_claim_lost", driver.language), show_alert=True)
        return

    await callback.answer()
    await callback.message.edit_text(
        f"{t('order_claimed_self', driver.language)}\n\n{trips_service.render_card(order, driver.language)}",
        reply_markup=order_enroute_kb(order.id, driver.language),
    )


@router.callback_query(F.data.startswith("order:enroute:"))
async def enroute(callback: CallbackQuery, session, bot_user) -> None:
    order_id = int(callback.data.split(":")[-1])

    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await callback.answer()
        return

    ok = await trips_service.perform_enroute(callback.bot, session, order_id, driver)
    if not ok:
        await callback.answer()
        return

    await callback.answer(t("order_enroute_confirmed", driver.language))
    await callback.message.edit_reply_markup(reply_markup=order_complete_kb(order_id, driver.language))


@router.callback_query(F.data.startswith("order:location:"))
async def location(callback: CallbackQuery, session, bot_user) -> None:
    order_id = int(callback.data.split(":")[-1])

    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await callback.answer("Bu amal faqat tasdiqlangan haydovchilar uchun.", show_alert=True)
        return

    order = await session.get(Order, order_id)
    if order is None:
        await callback.answer()
        return

    await callback.answer()

    if order.pickup_lat is not None and order.pickup_lng is not None:
        lat, lng = order.pickup_lat, order.pickup_lng
        builder = InlineKeyboardBuilder()
        builder.button(text="🟡 Yandex Maps", url=f"https://yandex.com/maps/?pt={lng},{lat}&z=16&l=map")
        builder.button(text="🔵 Google Maps", url=f"https://maps.google.com/?q={lat},{lng}")
        builder.adjust(1)
        await callback.message.answer("📍", reply_markup=builder.as_markup())
    elif order.pickup_text:
        await callback.message.answer(t("order_location_text_only", driver.language, text=order.pickup_text))
    else:
        await callback.message.answer(t("order_location_text_only", driver.language, text="—"))


@router.callback_query(F.data.startswith("order:cancelclaim:"))
async def cancel_claim(callback: CallbackQuery, session, bot_user) -> None:
    order_id = int(callback.data.split(":")[-1])

    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await callback.answer()
        return

    order = await trips_service.perform_cancel_claim(callback.bot, session, order_id, driver)
    if order is None:
        await callback.answer()
        return

    await callback.answer(t("order_claim_cancelled_self", driver.language))
    await callback.message.edit_reply_markup()


@router.callback_query(F.data.startswith("order:complete:"))
async def complete(callback: CallbackQuery, session, bot_user) -> None:
    order_id = int(callback.data.split(":")[-1])

    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await callback.answer()
        return

    ok = await trips_service.perform_complete(callback.bot, session, order_id, driver)
    if not ok:
        await callback.answer()
        return

    await callback.answer(t("order_completed_confirmed", driver.language))
    await callback.message.edit_reply_markup()
