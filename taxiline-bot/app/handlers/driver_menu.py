from datetime import datetime

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import select

from app.data.cars import CAR_BRANDS
from app.data.regions import REGION_NAMES
from app.db.models import Order
from app.i18n.translations import t
from app.keyboards.common import menu_text, share_phone_kb
from app.keyboards.regions import driver_region_kb
from app.keyboards.trip import driver_car_kb, order_claim_kb
from app.services import drivers as drivers_service
from app.services import groups as groups_service
from app.services import trips as trips_service
from app.services.backend_client import backend_client
from app.services.phone import format_phone, normalize_phone
from app.states.driver import DriverProfileEdit

router = Router(name="driver_menu")


async def _get_approved_driver(session, bot_user):
    if bot_user is None:
        return None
    driver = await drivers_service.get_by_bot_user(session, bot_user.id)
    if driver is None or driver.status != "APPROVED":
        return None
    return driver


def _driver_edit_kb(lang: str):
    builder = InlineKeyboardBuilder()
    builder.button(text=t("driver_edit_name", lang), callback_data="driveredit:name")
    builder.button(text=t("driver_edit_phone", lang), callback_data="driveredit:phone")
    builder.button(text=t("driver_edit_car", lang), callback_data="driveredit:car")
    builder.button(text=t("driver_edit_plate", lang), callback_data="driveredit:plate")
    builder.button(text=t("driver_edit_region", lang), callback_data="driveredit:region")
    builder.button(text=t("driver_edit_to_region", lang), callback_data="driveredit:toregion")
    builder.adjust(1)
    return builder.as_markup()


async def _sync_driver_to_backend(driver, telegram_id: int) -> None:
    """Best-effort push of the fields the webapp/admin dashboard cares about (server/'s Driver
    row has no region columns, so region/to_region edits stay bot-local)."""
    await backend_client.sync_driver(
        phone=driver.phone,
        telegram_id=telegram_id,
        name=driver.full_name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=driver.status == "APPROVED",
        status=driver.status,
    )


@router.message(menu_text("menu_driver_profile"))
async def driver_profile(message: Message, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        return

    route = f"{driver.region} → {driver.to_region}" if driver.to_region else driver.region

    if driver.subscription and driver.subscription.active:
        days_left = max((driver.subscription.expires_at - datetime.utcnow()).days, 0)
        subscription_text = t(
            "driver_subscription_active",
            lang,
            days=days_left,
            expires=driver.subscription.expires_at.strftime("%Y-%m-%d"),
        )
    else:
        subscription_text = t("driver_subscription_none", lang)

    await message.answer(
        t(
            "driver_profile_view",
            lang,
            name=driver.full_name,
            phone=format_phone(driver.phone),
            car_brand=driver.car_model,
            plate=driver.plate,
            route=route,
            status="✅",
            subscription=subscription_text,
        )
    )
    await message.answer(t("profile_edit_hint", lang), reply_markup=_driver_edit_kb(lang))


@router.callback_query(F.data == "driveredit:name")
async def start_edit_name(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_name", lang))
    await state.set_state(DriverProfileEdit.entering_name)


@router.message(DriverProfileEdit.entering_name, F.text)
async def save_edit_name(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await state.clear()
        return
    await drivers_service.update_full_name(session, driver, message.text.strip())
    await _sync_driver_to_backend(driver, bot_user.telegram_id)
    await state.clear()
    await message.answer(t("saved_ok", lang))


@router.callback_query(F.data == "driveredit:phone")
async def start_edit_phone(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_phone", lang), reply_markup=share_phone_kb(lang))
    await state.set_state(DriverProfileEdit.entering_phone)


@router.message(DriverProfileEdit.entering_phone, F.contact)
async def save_edit_phone_contact(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await _save_edit_phone(message, state, session, bot_user, lang, message.contact.phone_number)


@router.message(DriverProfileEdit.entering_phone, F.text)
async def save_edit_phone_text(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await _save_edit_phone(message, state, session, bot_user, lang, message.text)


async def _save_edit_phone(
    message: Message, state: FSMContext, session, bot_user, lang: str, raw_phone: str
) -> None:
    phone = normalize_phone(raw_phone)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return
    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await state.clear()
        return
    await drivers_service.update_phone(session, driver, phone)
    await _sync_driver_to_backend(driver, bot_user.telegram_id)
    await state.clear()
    await message.answer(t("saved_ok", lang), reply_markup=ReplyKeyboardRemove())


@router.callback_query(F.data == "driveredit:car")
async def start_edit_car(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_car", lang), reply_markup=driver_car_kb())
    await state.set_state(DriverProfileEdit.choosing_car)


@router.callback_query(DriverProfileEdit.choosing_car, F.data.startswith("driver:car:"))
async def save_edit_car(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    await callback.answer()
    if driver is None:
        await state.clear()
        return
    idx = int(callback.data.split(":")[-1])
    await drivers_service.update_car_model(session, driver, CAR_BRANDS[idx])
    await _sync_driver_to_backend(driver, bot_user.telegram_id)
    await state.clear()
    await callback.message.edit_text(t("saved_ok", lang))


@router.callback_query(F.data == "driveredit:plate")
async def start_edit_plate(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_plate", lang))
    await state.set_state(DriverProfileEdit.entering_plate)


@router.message(DriverProfileEdit.entering_plate, F.text)
async def save_edit_plate(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        await state.clear()
        return
    await drivers_service.update_plate(session, driver, message.text.strip())
    await _sync_driver_to_backend(driver, bot_user.telegram_id)
    await state.clear()
    await message.answer(t("saved_ok", lang))


@router.callback_query(F.data == "driveredit:region")
async def start_edit_region(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_region", lang), reply_markup=driver_region_kb())
    await state.set_state(DriverProfileEdit.choosing_region)


@router.callback_query(DriverProfileEdit.choosing_region, F.data.startswith("driverregion:"))
async def save_edit_region(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    await callback.answer()
    if driver is None:
        await state.clear()
        return
    idx = int(callback.data.split(":")[-1])
    await drivers_service.update_region(session, driver, REGION_NAMES[idx])
    await state.clear()
    await callback.message.edit_text(t("saved_ok", lang))


@router.callback_query(F.data == "driveredit:toregion")
async def start_edit_to_region(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    if await _get_approved_driver(session, bot_user) is None:
        return
    await callback.message.answer(t("ask_driver_to_region", lang), reply_markup=driver_region_kb())
    await state.set_state(DriverProfileEdit.choosing_to_region)


@router.callback_query(DriverProfileEdit.choosing_to_region, F.data.startswith("driverregion:"))
async def save_edit_to_region(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    await callback.answer()
    if driver is None:
        await state.clear()
        return
    idx = int(callback.data.split(":")[-1])
    await drivers_service.update_to_region(session, driver, REGION_NAMES[idx])
    await state.clear()
    await callback.message.edit_text(t("saved_ok", lang))


@router.message(menu_text("menu_driver_open_orders"))
async def driver_open_orders(message: Message, session, bot_user, lang: str) -> None:
    driver = await _get_approved_driver(session, bot_user)
    if driver is None:
        return

    # Same rule as dispatch: orders from the driver's region and the return leg of their route.
    result = await session.execute(select(Order).where(Order.status == "OPEN").order_by(Order.created_at.desc()))
    orders = [o for o in result.scalars() if groups_service.driver_serves(driver, o.from_region, o.to_region)]

    if not orders:
        await message.answer(t("driver_open_orders_empty", lang))
        return

    for order in orders:
        has_location = bool((order.pickup_lat is not None and order.pickup_lng is not None) or order.pickup_text)
        await message.answer(
            trips_service.render_card(order, lang), reply_markup=order_claim_kb(order.id, lang, has_location)
        )
