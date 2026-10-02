from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.db.models import BotUser, DriverProfile, Order
from app.i18n.translations import t
from app.services.backend_client import backend_client

router = Router(name="rating")


@router.callback_query(F.data.startswith("rate:"))
async def submit_rating(callback: CallbackQuery, session, bot_user) -> None:
    _, order_id_str, role, stars_str = callback.data.split(":")
    order_id = int(order_id_str)
    stars = int(stars_str)
    lang = bot_user.language if bot_user else "uz"

    order = await session.get(Order, order_id)
    if order is None or bot_user is None:
        await callback.answer()
        return

    driver = await session.get(DriverProfile, order.assigned_driver_id) if order.assigned_driver_id else None
    client = await session.get(BotUser, order.bot_user_id)

    if role == "d":
        # Only the driver who actually completed this trip may rate its passenger.
        if driver is None or driver.bot_user_id != bot_user.id or client is None:
            await callback.answer()
            return
        rater_telegram_id = bot_user.telegram_id
        ratee_telegram_id = client.telegram_id
        direction = "DRIVER_RATES_PASSENGER"
    else:
        # Only the passenger who actually took this trip may rate its driver.
        if client is None or client.id != bot_user.id or driver is None:
            await callback.answer()
            return
        driver_bot_user = await session.get(BotUser, driver.bot_user_id)
        if driver_bot_user is None:
            await callback.answer()
            return
        rater_telegram_id = bot_user.telegram_id
        ratee_telegram_id = driver_bot_user.telegram_id
        direction = "PASSENGER_RATES_DRIVER"

    ok = await backend_client.submit_rating(
        rater_telegram_id=rater_telegram_id,
        ratee_telegram_id=ratee_telegram_id,
        trip_ref=f"bot:{order_id}",
        direction=direction,
        stars=stars,
    )

    if not ok:
        await callback.answer(t("rating_failed", lang), show_alert=True)
        return

    await callback.answer(t("rating_thanks", lang))
    await callback.message.edit_reply_markup()
