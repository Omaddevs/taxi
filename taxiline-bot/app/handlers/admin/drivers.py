from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES
from app.keyboards.admin import ADMIN_DRIVERS_BTN
from app.services import drivers as drivers_service
from app.services.backend_client import backend_client
from app.services.driver_review import notify_rejected_driver, welcome_approved_driver
from app.states.admin_broadcast import AdminDriverAction

router = Router(name="admin_drivers")

_EMPTY_TEXT = {
    "pending": "Kutilayotgan arizalar yo'q.",
    "approved": "Tasdiqlangan haydovchilar yo'q.",
    "blocked": "Bloklangan haydovchilar yo'q.",
}


async def _get_filtered_drivers(session, filter_key: str):
    if filter_key == "pending":
        return await drivers_service.list_pending(session)
    if filter_key == "approved":
        return await drivers_service.list_by_status(session, "APPROVED", blocked=False)
    if filter_key == "blocked":
        return await drivers_service.list_blocked(session)
    return []


def _nav_buttons(builder: InlineKeyboardBuilder, filter_key: str, index: int, total: int) -> None:
    if index > 0:
        builder.button(text="⬅️ Oldingi", callback_data=f"admindriverlist:{filter_key}:{index - 1}")
    if index < total - 1:
        builder.button(text="Keyingi ➡️", callback_data=f"admindriverlist:{filter_key}:{index + 1}")


_GENDER_NEXT = {None: "FEMALE", "FEMALE": "MALE", "MALE": "FEMALE"}
_GENDER_BTN = {"FEMALE": "⚧ Jinsi → 👩 Ayol", "MALE": "⚧ Jinsi → 👨 Erkak"}


def _gender_button(builder: InlineKeyboardBuilder, driver, filter_key: str, index: int) -> None:
    target = _GENDER_NEXT[driver.gender if driver.gender in ("MALE", "FEMALE") else None]
    builder.button(text=_GENDER_BTN[target], callback_data=f"admindrivergender:{driver.id}:{target}:{filter_key}:{index}")


def _pending_kb(driver, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Tasdiqlash", callback_data=f"admindriver:approve:{driver.id}:{index}")
    builder.button(text="❌ Rad etish", callback_data=f"admindriver:reject:{driver.id}:{index}")
    _gender_button(builder, driver, "pending", index)
    _nav_buttons(builder, "pending", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _approved_kb(driver, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="🚫 Bloklash", callback_data=f"admindriverblock:{driver.id}:1:approved:{index}")
    builder.button(text="📞 Qo'ng'iroq qilish", url=f"tel:{driver.phone}")
    builder.button(text="🔀 Boshqa guruhga o'tkazish", callback_data=f"admindrivermove:{driver.id}:approved:{index}")
    _gender_button(builder, driver, "approved", index)
    _nav_buttons(builder, "approved", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _blocked_kb(driver, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Blokdan chiqarish", callback_data=f"admindriverblock:{driver.id}:0:blocked:{index}")
    builder.button(text="📞 Qo'ng'iroq qilish", url=f"tel:{driver.phone}")
    _gender_button(builder, driver, "blocked", index)
    _nav_buttons(builder, "blocked", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _kb_for(filter_key: str, driver, index: int, total: int):
    if filter_key == "pending":
        return _pending_kb(driver, index, total)
    if filter_key == "approved":
        return _approved_kb(driver, index, total)
    return _blocked_kb(driver, index, total)


async def _render_list(callback: CallbackQuery, session, filter_key: str, index: int) -> None:
    drivers = await _get_filtered_drivers(session, filter_key)
    if not drivers:
        await callback.message.edit_text(_EMPTY_TEXT[filter_key])
        return

    index = max(0, min(index, len(drivers) - 1))
    driver = drivers[index]
    text = await drivers_service.render_driver_card(session, driver)
    text += f"\n\n({index + 1}/{len(drivers)})"
    await callback.message.edit_text(text, reply_markup=_kb_for(filter_key, driver, index, len(drivers)))


@router.message(F.text == ADMIN_DRIVERS_BTN)
async def drivers_menu(message: Message, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    builder = InlineKeyboardBuilder()
    builder.button(text="⏳ Tasdiqlanmagan", callback_data="admindriverlist:pending:0")
    builder.button(text="✅ Tasdiqlangan", callback_data="admindriverlist:approved:0")
    builder.button(text="🚫 Bloklangan", callback_data="admindriverlist:blocked:0")
    builder.adjust(1)
    await message.answer("🚗 Haydovchilar — bo'limni tanlang:", reply_markup=builder.as_markup())


@router.callback_query(F.data.startswith("admindriverlist:"))
async def list_view(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    _, filter_key, index_str = callback.data.split(":")
    await callback.answer()
    await _render_list(callback, session, filter_key, int(index_str))


@router.callback_query(F.data.startswith("admindriver:approve:"))
async def approve_driver(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    driver_id, index = _parse_review_callback(callback.data)
    driver = await drivers_service.get(session, driver_id)
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return
    if driver.status == "APPROVED":
        await callback.answer("Allaqachon tasdiqlangan", show_alert=True)
        await _close_review_message(callback, index, session, "✅ Tasdiqlangan")
        return

    await drivers_service.approve_application(session, driver)
    await callback.answer("Tasdiqlandi ✅")

    telegram_id = driver.bot_user.telegram_id

    # Explicit, first-class step — must not depend on _build_menu's side effect (which only
    # runs if the driver later interacts with the bot again). Without this, an approved driver
    # who goes straight to the webapp without touching the bot again stays stuck as a
    # PASSENGER on the server side forever.
    await backend_client.sync_driver(
        phone=driver.phone or driver.bot_user.phone,
        telegram_id=telegram_id,
        name=driver.full_name or driver.bot_user.name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=True,
        status="APPROVED",
    )

    warning = await welcome_approved_driver(callback.bot, session, driver)
    if warning:
        await callback.message.answer(warning)

    await _close_review_message(callback, index, session, "✅ Tasdiqlandi")


def _parse_review_callback(data: str) -> tuple[int, int | None]:
    """admindriver:<action>:<driver_id>[:<list index>] — the index is only present when the
    button came from the paginated admin list; the new-application DM sends it without."""
    parts = data.split(":")
    index = int(parts[3]) if len(parts) > 3 else None
    return int(parts[2]), index


async def _close_review_message(callback: CallbackQuery, index: int | None, session, verdict: str) -> None:
    if index is not None:
        await _render_list(callback, session, "pending", index)
        return
    # From the new-application DM: keep the card, swap the buttons for the verdict.
    try:
        await callback.message.edit_text(f"{callback.message.text}\n\n{verdict}")
    except TelegramAPIError:
        pass


@router.callback_query(F.data.startswith("admindriver:reject:"))
async def reject_driver_start(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    driver_id, index = _parse_review_callback(callback.data)
    await state.update_data(reject_driver_id=driver_id, reject_index=index)
    await state.set_state(AdminDriverAction.entering_rejection_reason)
    await callback.answer()
    await callback.message.answer("Rad etish sababini yozing:")


@router.message(AdminDriverAction.entering_rejection_reason, F.text)
async def reject_driver_reason(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    data = await state.get_data()
    driver = await drivers_service.get(session, data["reject_driver_id"])
    await state.clear()
    if driver is None:
        return

    reason = message.text.strip()
    await drivers_service.reject(session, driver, reason)
    await message.answer("Rad etildi ❌")

    await backend_client.sync_driver(
        phone=driver.phone or driver.bot_user.phone,
        telegram_id=driver.bot_user.telegram_id,
        name=driver.full_name or driver.bot_user.name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=False,
        status="REJECTED",
        rejection_reason=reason,
    )
    await notify_rejected_driver(message.bot, driver.bot_user.telegram_id, driver.language, reason)


@router.callback_query(F.data.startswith("admindriverblock:"))
async def toggle_block(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, driver_id_str, flag, filter_key, index_str = callback.data.split(":")
    driver = await drivers_service.get(session, int(driver_id_str))
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await drivers_service.set_blocked(session, driver, flag == "1")
    await backend_client.sync_driver(
        phone=driver.phone or driver.bot_user.phone,
        telegram_id=driver.bot_user.telegram_id,
        name=driver.full_name or driver.bot_user.name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=driver.status == "APPROVED",
        status=driver.status,
        blocked=flag == "1",
    )
    await callback.answer("Yangilandi ✅")
    # Blocking moves the driver out of "approved" into "blocked" (and vice versa), so re-render
    # from whichever tab they were just looking at — the item at this index is now whatever
    # took its place there.
    await _render_list(callback, session, filter_key, int(index_str))


@router.callback_query(F.data.startswith("admindrivergender:"))
async def set_gender(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, driver_id_str, gender, filter_key, index_str = callback.data.split(":")
    driver = await drivers_service.get(session, int(driver_id_str))
    if driver is None or gender not in ("MALE", "FEMALE"):
        await callback.answer("Topilmadi", show_alert=True)
        return

    await drivers_service.update_gender(session, driver, gender)
    await backend_client.sync_driver(
        phone=driver.phone,
        telegram_id=driver.bot_user.telegram_id,
        name=driver.full_name,
        car_model=driver.car_model,
        plate=driver.plate,
        approved=driver.status == "APPROVED",
        status=driver.status,
        gender=gender,
    )
    await callback.answer("Yangilandi ✅")
    await _render_list(callback, session, filter_key, int(index_str))


@router.callback_query(F.data.startswith("admindrivermove:"))
async def start_move(callback: CallbackQuery, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, driver_id_str, filter_key, index_str = callback.data.split(":")
    await callback.answer()

    builder = InlineKeyboardBuilder()
    for i, region in enumerate(REGION_NAMES):
        builder.button(text=region, callback_data=f"admindrivermoveto:{driver_id_str}:{i}:{filter_key}:{index_str}")
    builder.adjust(1)
    await callback.message.edit_text("Haydovchini qaysi viloyatga o'tkazasiz?", reply_markup=builder.as_markup())


@router.callback_query(F.data.startswith("admindrivermoveto:"))
async def finish_move(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, driver_id_str, region_idx_str, filter_key, index_str = callback.data.split(":")
    driver = await drivers_service.get(session, int(driver_id_str))
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    new_region = REGION_NAMES[int(region_idx_str)]
    await drivers_service.update_region(session, driver, new_region)
    await callback.answer(f"{new_region} guruhiga o'tkazildi ✅")

    try:
        await callback.bot.send_message(
            driver.bot_user.telegram_id,
            f"📍 Sizning ish hududingiz {new_region} deb yangilandi. Endi shu viloyat buyurtmalarini olasiz.",
        )
    except TelegramAPIError:
        pass

    await _render_list(callback, session, filter_key, int(index_str))
