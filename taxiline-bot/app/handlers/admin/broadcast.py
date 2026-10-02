from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES
from app.keyboards.admin import ADMIN_BROADCAST_BTN
from app.services.broadcast import send_broadcast
from app.states.admin_broadcast import AdminBroadcast

router = Router(name="admin_broadcast")


def _skip_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="⏭ O'tkazib yuborish", callback_data="broadcast:skipbutton")
    return builder.as_markup()


def _yes_no_kb(yes_cb: str, no_cb: str):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Ha", callback_data=yes_cb)
    builder.button(text="❌ Yo'q", callback_data=no_cb)
    builder.adjust(2)
    return builder.as_markup()


def _audience_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="👥 Hammaga", callback_data="broadcast:aud:all")
    builder.button(text="🙍 Faqat mijozlarga", callback_data="broadcast:aud:CLIENT")
    builder.button(text="🚗 Faqat haydovchilarga", callback_data="broadcast:aud:DRIVER")
    builder.button(text="📍 Viloyat bo'yicha (haydovchilar)", callback_data="broadcast:aud:region")
    builder.adjust(1)
    return builder.as_markup()


def _region_kb():
    builder = InlineKeyboardBuilder()
    for region in REGION_NAMES:
        builder.button(text=region, callback_data=f"broadcast:region:{region}")
    builder.adjust(1)
    return builder.as_markup()


@router.message(F.text == ADMIN_BROADCAST_BTN)
async def start_broadcast(message: Message, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await message.answer(
        "📢 E'lon matnini, rasm/video/fayl (caption bilan) yoki ovozli xabarni yuboring — "
        "aynan shu xabar barcha qabul qiluvchilarga jo'natiladi:"
    )
    await state.set_state(AdminBroadcast.composing)


@router.message(AdminBroadcast.composing)
async def receive_content(message: Message, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await state.update_data(source_chat_id=message.chat.id, source_message_id=message.message_id)
    await message.answer(
        "Tugma qo'shmoqchimisiz? 'Nom | https://havola' ko'rinishida yozing, yoki o'tkazib yuboring:",
        reply_markup=_skip_kb(),
    )
    await state.set_state(AdminBroadcast.adding_button)


@router.callback_query(AdminBroadcast.adding_button, F.data == "broadcast:skipbutton")
async def skip_button(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await state.update_data(button=None)
    await callback.answer()
    await callback.message.edit_text(
        "🔊 Ovozli xabar sifatida ham yuborilsinmi?", reply_markup=_yes_no_kb("broadcast:tts:yes", "broadcast:tts:no")
    )
    await state.set_state(AdminBroadcast.asking_tts)


@router.message(AdminBroadcast.adding_button, F.text)
async def add_button(message: Message, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    if "|" not in message.text:
        await message.answer("Format: Nom | https://havola — yoki tugmani o'tkazib yuboring.", reply_markup=_skip_kb())
        return
    label, url = (part.strip() for part in message.text.split("|", 1))
    if not url.startswith("http"):
        await message.answer("Havola http(s):// bilan boshlanishi kerak.")
        return
    await state.update_data(button={"label": label, "url": url})
    await message.answer("🔊 Ovozli xabar sifatida ham yuborilsinmi?", reply_markup=_yes_no_kb("broadcast:tts:yes", "broadcast:tts:no"))
    await state.set_state(AdminBroadcast.asking_tts)


@router.callback_query(AdminBroadcast.asking_tts, F.data.in_({"broadcast:tts:yes", "broadcast:tts:no"}))
async def ask_tts(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await state.update_data(tts=callback.data == "broadcast:tts:yes")
    await callback.answer()
    await callback.message.edit_text("Qabul qiluvchilarni tanlang:", reply_markup=_audience_kb())
    await state.set_state(AdminBroadcast.choosing_audience)


@router.callback_query(AdminBroadcast.choosing_audience, F.data.startswith("broadcast:aud:"))
async def choose_audience(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    choice = callback.data.split(":")[-1]
    await callback.answer()

    if choice == "region":
        await callback.message.edit_text("Viloyatni tanlang:", reply_markup=_region_kb())
        return

    audience_filter = {} if choice == "all" else {"role": choice}
    await state.update_data(audience_filter=audience_filter)
    await _confirm(callback.message, state)


@router.callback_query(AdminBroadcast.choosing_audience, F.data.startswith("broadcast:region:"))
async def choose_region(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    region = callback.data.split(":", 2)[-1]
    await state.update_data(audience_filter={"role": "DRIVER", "region": region})
    await callback.answer()
    await _confirm(callback.message, state)


async def _confirm(message: Message, state: FSMContext) -> None:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Yuborish", callback_data="broadcast:send")
    builder.button(text="❌ Bekor qilish", callback_data="broadcast:cancel")
    builder.adjust(2)
    await message.edit_text("Tayyor. Yuborishni tasdiqlaysizmi?", reply_markup=builder.as_markup())
    await state.set_state(AdminBroadcast.confirming)


@router.callback_query(AdminBroadcast.confirming, F.data == "broadcast:send")
async def confirm_send(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    data = await state.get_data()
    await callback.answer()
    await callback.message.edit_text("⏳ Yuborilmoqda...")

    tts_text = None
    if data.get("tts"):
        source = await callback.bot.forward_message(
            callback.message.chat.id, data["source_chat_id"], data["source_message_id"]
        )
        tts_text = source.text or source.caption
        await source.delete()

    sent = await send_broadcast(
        callback.bot,
        session,
        admin_telegram_id=bot_user.telegram_id,
        source_chat_id=data["source_chat_id"],
        source_message_id=data["source_message_id"],
        button=data.get("button"),
        tts_text=tts_text,
        audience_filter=data.get("audience_filter", {}),
    )
    await state.clear()
    await callback.message.edit_text(f"✅ Yuborildi: {sent} ta qabul qiluvchiga.")


@router.callback_query(AdminBroadcast.confirming, F.data == "broadcast:cancel")
async def cancel_broadcast(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await state.clear()
    await callback.answer()
    await callback.message.edit_text("❌ Bekor qilindi.")
