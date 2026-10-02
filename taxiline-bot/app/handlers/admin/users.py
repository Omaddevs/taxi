from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import BotUser
from app.keyboards.admin import ADMIN_CLIENTS_BTN
from app.services import users as users_service
from app.services.phone import format_phone
from app.states.admin_broadcast import AdminClientSearch

router = Router(name="admin_users")


def _client_row_kb(client_id: int, blocked: bool):
    builder = InlineKeyboardBuilder()
    if blocked:
        builder.button(text="✅ Blokdan chiqarish", callback_data=f"adminclientblock:{client_id}:0")
    else:
        builder.button(text="🚫 Bloklash", callback_data=f"adminclientblock:{client_id}:1")
    builder.adjust(1)
    return builder.as_markup()


@router.message(F.text == ADMIN_CLIENTS_BTN)
async def ask_client_query(message: Message, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await message.answer("Mijozni qidirish uchun telefon, ism, username yoki Telegram ID kiriting:")
    await state.set_state(AdminClientSearch.entering_query)


@router.message(AdminClientSearch.entering_query, F.text)
async def search_clients(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await state.clear()

    results = await users_service.search(session, message.text.strip())
    if not results:
        await message.answer("Hech kim topilmadi.")
        return

    for client in results:
        status = "🚫 bloklangan" if client.blocked else "✅ faol"
        contact = f"@{client.username}" if client.username else "—"
        await message.answer(
            f"👤 {client.name or '—'} ({contact})\n"
            f"📱 {format_phone(client.phone) if client.phone else '—'}\n"
            f"🆔 {client.telegram_id}\n"
            f"🚕 Safarlar: {client.trips_count} · Holati: {status}",
            reply_markup=_client_row_kb(client.id, client.blocked),
        )


@router.callback_query(F.data.startswith("adminclientblock:"))
async def toggle_client_block(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, client_id, flag = callback.data.split(":")
    client = await session.get(BotUser, int(client_id))
    if client is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await users_service.set_blocked(session, client, flag == "1")
    await callback.answer("Yangilandi ✅")
    await callback.message.edit_reply_markup(reply_markup=_client_row_kb(client.id, client.blocked))
