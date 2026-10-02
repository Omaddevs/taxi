from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, FSInputFile, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES
from app.handlers.start import send_menu_to
from app.i18n.translations import t
from app.keyboards.admin import ADMIN_DRIVERS_BTN
from app.services import drivers as drivers_service
from app.services import groups as groups_service
from app.services.backend_client import backend_client
from app.states.admin_broadcast import AdminDriverAction
from app.tts.engine import synth

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


def _pending_kb(driver_id: int, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Tasdiqlash", callback_data=f"admindriver:approve:{driver_id}:{index}")
    builder.button(text="❌ Rad etish", callback_data=f"admindriver:reject:{driver_id}:{index}")
    _nav_buttons(builder, "pending", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _approved_kb(driver, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="🚫 Bloklash", callback_data=f"admindriverblock:{driver.id}:1:approved:{index}")
    builder.button(text="📞 Qo'ng'iroq qilish", url=f"tel:{driver.phone}")
    builder.button(text="🔀 Boshqa guruhga o'tkazish", callback_data=f"admindrivermove:{driver.id}:approved:{index}")
    _nav_buttons(builder, "approved", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _blocked_kb(driver, index: int, total: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Blokdan chiqarish", callback_data=f"admindriverblock:{driver.id}:0:blocked:{index}")
    builder.button(text="📞 Qo'ng'iroq qilish", url=f"tel:{driver.phone}")
    _nav_buttons(builder, "blocked", index, total)
    builder.adjust(2)
    return builder.as_markup()


def _kb_for(filter_key: str, driver, index: int, total: int):
    if filter_key == "pending":
        return _pending_kb(driver.id, index, total)
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

    _, _, driver_id_str, index_str = callback.data.split(":")
    driver = await drivers_service.get(session, int(driver_id_str))
    if driver is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await drivers_service.approve_application(session, driver)
    await callback.answer("Tasdiqlandi ✅")

    telegram_id = driver.bot_user.telegram_id
    lang = driver.language

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
    )

    try:
        await callback.bot.send_message(telegram_id, t("driver_approved_dm", lang))
        path = await synth(t("driver_approved_dm", lang), lang)
        await callback.bot.send_audio(telegram_id, FSInputFile(path))
    except Exception:
        pass  # DM/TTS is best-effort; approval itself already succeeded above

    # Switch them to the driver-oriented menu immediately, not just on their next /start.
    try:
        await send_menu_to(callback.bot, telegram_id, session, driver.bot_user, lang)
    except TelegramAPIError:
        pass

    group = await groups_service.get_closed_group_for_driver(session, driver)
    if group is None:
        try:
            await callback.bot.send_message(telegram_id, t("driver_group_invite_missing", lang))
        except TelegramAPIError:
            pass
    else:
        try:
            invite = await callback.bot.create_chat_invite_link(
                group.chat_id, name=f"driver-{driver.id}", creates_join_request=True
            )
            await callback.bot.send_message(telegram_id, t("driver_group_invite_message", lang, link=invite.invite_link))
        except TelegramAPIError:
            await callback.message.answer(
                "⚠️ Guruh havolasini yaratib bo'lmadi — botning guruhda 'foydalanuvchi qo'shish' huquqi "
                "borligini tekshiring."
            )

    await _render_list(callback, session, "pending", int(index_str))


@router.callback_query(F.data.startswith("admindriver:reject:"))
async def reject_driver_start(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, _, driver_id_str, index_str = callback.data.split(":")
    await state.update_data(reject_driver_id=int(driver_id_str), reject_index=int(index_str))
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

    await drivers_service.reject(session, driver, message.text.strip())
    await message.answer("Rad etildi ❌")

    try:
        await message.bot.send_message(
            driver.bot_user.telegram_id, t("driver_rejected_dm", driver.language, reason=message.text.strip())
        )
    except TelegramAPIError:
        pass


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
    await callback.answer("Yangilandi ✅")
    # Blocking moves the driver out of "approved" into "blocked" (and vice versa), so re-render
    # from whichever tab they were just looking at — the item at this index is now whatever
    # took its place there.
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
