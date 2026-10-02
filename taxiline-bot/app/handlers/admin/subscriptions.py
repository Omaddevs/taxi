from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.admin import ADMIN_SUBSCRIPTIONS_BTN
from app.services import drivers as drivers_service
from app.services.phone import normalize_phone
from app.states.admin_broadcast import AdminSubscriptionSearch

router = Router(name="admin_subscriptions")


def _entry_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="🚗 Avto", callback_data="adminsub:byplate")
    builder.button(text="📱 Phone", callback_data="adminsub:byphone")
    builder.adjust(2)
    return builder.as_markup()


def _result_kb(driver_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="🔄 Obunani yangilash", callback_data=f"adminsub:renew:{driver_id}")
    builder.button(text="❌ Obunani bekor qilish", callback_data=f"adminsub:cancel:{driver_id}")
    builder.adjust(1)
    return builder.as_markup()


@router.message(F.text == ADMIN_SUBSCRIPTIONS_BTN)
async def subscriptions_menu(message: Message, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await message.answer("📋 Obunalar — haydovchini qidirish uchun tanlang:", reply_markup=_entry_kb())


@router.callback_query(F.data == "adminsub:byplate")
async def ask_plate(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.answer(
        "Avtomobil davlat raqamini kiriting (masalan: 60E091GB — probel yoki kichik harf bilan yozsangiz ham topadi):"
    )
    await state.set_state(AdminSubscriptionSearch.entering_plate)


@router.message(AdminSubscriptionSearch.entering_plate, F.text)
async def search_by_plate(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await state.clear()
    driver = await drivers_service.find_by_plate(session, message.text.strip())
    if driver is None:
        await message.answer("Bu raqam bo'yicha haydovchi topilmadi.")
        return
    await message.answer(await drivers_service.render_driver_card(session, driver), reply_markup=_result_kb(driver.id))


@router.callback_query(F.data == "adminsub:byphone")
async def ask_phone(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.answer("Telefon raqamini kiriting:")
    await state.set_state(AdminSubscriptionSearch.entering_phone)


@router.message(AdminSubscriptionSearch.entering_phone, F.text)
async def search_by_phone(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await state.clear()
    phone = normalize_phone(message.text) or message.text.strip()
    driver = await drivers_service.find_by_phone(session, phone)
    if driver is None:
        await message.answer("Bu raqam bo'yicha haydovchi topilmadi.")
        return
    await message.answer(await drivers_service.render_driver_card(session, driver), reply_markup=_result_kb(driver.id))


@router.callback_query(F.data.startswith("adminsub:renew:"))
async def renew(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    driver_id = int(callback.data.split(":")[-1])
    driver = await drivers_service.get(session, driver_id)
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    # renew_subscription (-> start_subscription) keeps driver.subscription in sync in place,
    # including the first-ever-subscription case, so `driver` itself already reflects it here.
    await drivers_service.renew_subscription(session, driver)
    await callback.answer("Obuna yangilandi ✅")
    await callback.message.edit_text(await drivers_service.render_driver_card(session, driver), reply_markup=_result_kb(driver_id))

    try:
        await callback.bot.send_message(driver.bot_user.telegram_id, "🎉 Obunangiz yangilandi!")
    except TelegramAPIError:
        pass


@router.callback_query(F.data.startswith("adminsub:cancel:"))
async def cancel(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    driver_id = int(callback.data.split(":")[-1])
    driver = await drivers_service.get(session, driver_id)
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await drivers_service.cancel_subscription(session, driver)
    refreshed = await drivers_service.get(session, driver_id)
    await callback.answer("Obuna bekor qilindi ✅")
    await callback.message.edit_text(await drivers_service.render_driver_card(session, refreshed), reply_markup=_result_kb(driver_id))

    try:
        await callback.bot.send_message(driver.bot_user.telegram_id, "❌ Obunangiz bekor qilindi.")
    except TelegramAPIError:
        pass
