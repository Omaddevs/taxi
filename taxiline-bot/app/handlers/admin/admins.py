from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.admin import ADMIN_ADMINS_BTN
from app.services import users as users_service
from app.states.admin_broadcast import AdminAddAdmin

router = Router(name="admin_admins")


def _add_admin_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="➕ Admin qo'shish", callback_data="adminadd:start")
    return builder.as_markup()


@router.message(F.text == ADMIN_ADMINS_BTN)
async def list_admins(message: Message, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    admins = await users_service.list_admins(session)
    lines = [f"• {a.name or a.phone or a.telegram_id} — ID: {a.telegram_id}" for a in admins]
    text = "👑 Adminlar ro'yxati:\n\n" + "\n".join(lines) if lines else "👑 Hozircha adminlar yo'q."
    await message.answer(text, reply_markup=_add_admin_kb())


@router.callback_query(F.data == "adminadd:start")
async def start_add_admin(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.answer(
        "Yangi admin qilmoqchi bo'lgan foydalanuvchining Telegram ID raqamini yuboring "
        "(masalan @userinfobot orqali bilib olishingiz mumkin):"
    )
    await state.set_state(AdminAddAdmin.entering_telegram_id)


@router.message(AdminAddAdmin.entering_telegram_id, F.text)
async def receive_admin_telegram_id(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    raw = message.text.strip()
    if not raw.lstrip("-").isdigit():
        await message.answer("Telegram ID faqat raqamlardan iborat bo'lishi kerak. Qayta yuboring:")
        return

    target_id = int(raw)
    await state.clear()

    result = await users_service.grant_admin_by_telegram_id(session, target_id, bot_user.telegram_id)

    if result == "already_admin":
        await message.answer("Bu foydalanuvchi allaqachon admin.")
        return

    if result == "promoted":
        await message.answer(f"✅ {target_id} admin etib tayinlandi.")
        try:
            await message.bot.send_message(target_id, "🎉 Siz TaxiLine botida admin etib tayinlandingiz!")
        except TelegramAPIError:
            pass
        return

    # "pending" — they haven't /start-ed the bot yet; admin rights apply automatically once they do.
    await message.answer(
        f"⏳ {target_id} hali botdan foydalanmagan. U /start bosgan zahoti avtomatik admin bo'ladi."
    )
