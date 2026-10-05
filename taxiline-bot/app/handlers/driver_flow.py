from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.cars import CAR_BRANDS
from app.data.regions import REGION_NAMES
from app.handlers.start import send_main_menu
from app.i18n.translations import t
from app.keyboards.common import menu_text, share_phone_kb
from app.keyboards.regions import driver_region_kb
from app.keyboards.trip import driver_car_kb
from app.services import drivers as drivers_service
from app.services import users as users_service
from app.services.backend_client import backend_client
from app.services.phone import format_phone, normalize_phone
from app.states.driver import DriverApplication

router = Router(name="driver_flow")


def _admin_review_kb(driver_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Tasdiqlash", callback_data=f"admindriver:approve:{driver_id}")
    builder.button(text="❌ Rad etish", callback_data=f"admindriver:reject:{driver_id}")
    builder.adjust(2)
    return builder.as_markup()


def _application_confirm_kb(lang: str):
    builder = InlineKeyboardBuilder()
    builder.button(text=t("driver_application_submit_btn", lang), callback_data="driverapp:submit")
    builder.button(text=t("order_edit_btn", lang), callback_data="driverapp:edit")
    builder.button(text=t("order_cancel_btn", lang), callback_data="driverapp:cancel")
    builder.adjust(1)
    return builder.as_markup()


_EDIT_FIELD_LABELS = {
    "name": "driver_edit_name",
    "phone": "driver_edit_phone",
    "car": "driver_edit_car",
    "plate": "driver_edit_plate",
    "region": "driver_edit_region",
    "toregion": "driver_edit_to_region",
}


def _application_edit_kb(lang: str):
    builder = InlineKeyboardBuilder()
    for field, key in _EDIT_FIELD_LABELS.items():
        builder.button(text=t(key, lang), callback_data=f"driverapp:edit:{field}")
    builder.button(text=t("back", lang), callback_data="driverapp:edit:back")
    builder.adjust(1)
    return builder.as_markup()


@router.message(menu_text("menu_become_driver"))
async def become_driver(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    if bot_user is None:
        return

    existing = await drivers_service.get_by_bot_user(session, bot_user.id)
    if existing is not None:
        if existing.status == "PENDING":
            await message.answer(t("driver_already_pending", lang))
            return
        if existing.status == "APPROVED":
            await message.answer(t("driver_already_approved", lang))
            return

    await message.answer(t("driver_intro", lang))
    await message.answer(t("ask_driver_name", lang))
    await state.set_state(DriverApplication.entering_name)


@router.message(DriverApplication.entering_name, F.text)
async def enter_driver_name(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(full_name=message.text.strip())
    if await _finish_edit(message, state, lang, edit=False):
        return
    await message.answer(t("ask_driver_phone", lang), reply_markup=share_phone_kb(lang))
    await state.set_state(DriverApplication.entering_phone)


@router.message(DriverApplication.entering_phone, F.contact)
async def driver_phone_contact(message: Message, state: FSMContext, lang: str) -> None:
    await _driver_phone(message, state, lang, message.contact.phone_number)


@router.message(DriverApplication.entering_phone, F.text)
async def driver_phone_text(message: Message, state: FSMContext, lang: str) -> None:
    await _driver_phone(message, state, lang, message.text)


async def _driver_phone(message: Message, state: FSMContext, lang: str, raw_phone: str) -> None:
    phone = normalize_phone(raw_phone)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return
    await state.update_data(phone=phone)
    # Clears the "share phone" reply keyboard — otherwise it lingers through the rest of the
    # (inline-only) application flow instead of disappearing right after use.
    await message.answer(t("phone_received_ack", lang), reply_markup=ReplyKeyboardRemove())
    if await _finish_edit(message, state, lang, edit=False):
        return
    await message.answer(t("ask_driver_car", lang), reply_markup=driver_car_kb())
    await state.set_state(DriverApplication.choosing_car)


@router.callback_query(DriverApplication.choosing_car, F.data.startswith("driver:car:"))
async def driver_pick_car(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    await state.update_data(car_model=CAR_BRANDS[idx])
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_driver_plate", lang))
    await state.set_state(DriverApplication.entering_plate)


@router.message(DriverApplication.entering_plate, F.text)
async def enter_plate(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(plate=message.text.strip())
    if await _finish_edit(message, state, lang, edit=False):
        return
    await message.answer(t("ask_driver_region", lang), reply_markup=driver_region_kb())
    await state.set_state(DriverApplication.choosing_region)


@router.callback_query(DriverApplication.choosing_region, F.data.startswith("driverregion:"))
async def pick_driver_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    await state.update_data(region=REGION_NAMES[idx])
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_driver_to_region", lang), reply_markup=driver_region_kb())
    await state.set_state(DriverApplication.choosing_to_region)


@router.callback_query(DriverApplication.choosing_to_region, F.data.startswith("driverregion:"))
async def pick_driver_to_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    await state.update_data(to_region=REGION_NAMES[idx])
    await callback.answer()
    await _show_summary(callback.message, state, lang, edit=True)


async def _finish_edit(message: Message, state: FSMContext, lang: str, *, edit: bool) -> bool:
    """When the step was reached from the summary's edit menu, jumps straight back to the
    summary instead of continuing the linear flow. Returns True if it did."""
    if not (await state.get_data()).get("editing"):
        return False
    await _show_summary(message, state, lang, edit=edit)
    return True


async def _show_summary(message: Message, state: FSMContext, lang: str, *, edit: bool) -> None:
    await state.update_data(editing=False)
    data = await state.get_data()
    text = t(
        "driver_application_summary",
        lang,
        full_name=data["full_name"],
        phone=format_phone(data["phone"]),
        car_model=data["car_model"],
        plate=data["plate"],
        region=data["region"],
        to_region=data["to_region"],
    )
    kb = _application_confirm_kb(lang)
    if edit:
        await message.edit_text(text, reply_markup=kb)
    else:
        await message.answer(text, reply_markup=kb)
    await state.set_state(DriverApplication.confirming)


@router.callback_query(DriverApplication.confirming, F.data == "driverapp:edit")
async def edit_application(callback: CallbackQuery, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_text(t("ask_edit_field", lang), reply_markup=_application_edit_kb(lang))


@router.callback_query(DriverApplication.confirming, F.data == "driverapp:edit:back")
async def edit_application_back(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await _show_summary(callback.message, state, lang, edit=True)


@router.callback_query(DriverApplication.confirming, F.data.startswith("driverapp:edit:"))
async def edit_application_field(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    field = callback.data.split(":")[-1]
    await callback.answer()
    await state.update_data(editing=True)
    if field == "name":
        await callback.message.edit_reply_markup()
        await callback.message.answer(t("ask_driver_name", lang))
        await state.set_state(DriverApplication.entering_name)
    elif field == "phone":
        await callback.message.edit_reply_markup()
        await callback.message.answer(t("ask_driver_phone", lang), reply_markup=share_phone_kb(lang))
        await state.set_state(DriverApplication.entering_phone)
    elif field == "plate":
        await callback.message.edit_reply_markup()
        await callback.message.answer(t("ask_driver_plate", lang))
        await state.set_state(DriverApplication.entering_plate)
    elif field == "car":
        await callback.message.edit_text(t("ask_driver_car", lang), reply_markup=driver_car_kb())
        await state.set_state(DriverApplication.choosing_car)
    elif field == "region":
        await callback.message.edit_text(t("ask_driver_region", lang), reply_markup=driver_region_kb())
        await state.set_state(DriverApplication.choosing_region)
    elif field == "toregion":
        await callback.message.edit_text(t("ask_driver_to_region", lang), reply_markup=driver_region_kb())
        await state.set_state(DriverApplication.choosing_to_region)


@router.callback_query(DriverApplication.confirming, F.data == "driverapp:cancel")
async def cancel_application(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_reply_markup()
    await state.clear()
    await callback.message.answer(t("driver_application_cancelled", lang))
    await send_main_menu(callback.message, session, bot_user, lang)


@router.callback_query(DriverApplication.confirming, F.data == "driverapp:submit")
async def submit_application(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    data = await state.get_data()

    driver = await drivers_service.create_application(
        session,
        bot_user,
        full_name=data["full_name"],
        phone=data["phone"],
        car_model=data["car_model"],
        plate=data["plate"],
        region=data["region"],
        to_region=data["to_region"],
    )
    await backend_client.sync_driver(
        phone=driver.phone,
        telegram_id=bot_user.telegram_id,
        name=driver.full_name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=False,
        status="PENDING",
        new_application=True,
    )
    await state.clear()
    await callback.answer()
    await callback.message.edit_text(t("driver_application_sent", lang))

    admins = await users_service.list_admins(session)
    summary = (
        f"🚗 Yangi haydovchi arizasi #{driver.id}\n\n"
        f"👤 {driver.full_name} — {format_phone(driver.phone)}\n"
        f"🚙 {driver.car_model} · {driver.plate}\n"
        f"📍 {driver.region} → {driver.to_region}"
    )
    for admin in admins:
        try:
            await callback.bot.send_message(admin.telegram_id, summary, reply_markup=_admin_review_kb(driver.id))
        except TelegramAPIError:
            continue
