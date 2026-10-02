from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import BotUser
from app.i18n.translations import t
from app.keyboards.admin import ADMIN_SUPPORT_BTN
from app.services import support as support_service
from app.states.admin_broadcast import AdminSupportReply

router = Router(name="admin_support")


def _reply_kb(ticket_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✍️ Javob berish", callback_data=f"adminsupportreply:{ticket_id}")
    builder.button(text="✅ Yopish", callback_data=f"adminsupportclose:{ticket_id}")
    builder.adjust(2)
    return builder.as_markup()


@router.message(F.text == ADMIN_SUPPORT_BTN)
async def list_tickets(message: Message, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    tickets = await support_service.list_open_tickets(session)
    if not tickets:
        await message.answer("Ochiq murojaatlar yo'q.")
        return

    for ticket in tickets:
        client = await session.get(BotUser, ticket.bot_user_id)
        who = client.name if client else "—"
        last = ticket.messages[-1].text if ticket.messages else "—"
        await message.answer(f"💬 Murojaat #{ticket.id} — {who}\n\n{last}", reply_markup=_reply_kb(ticket.id))


@router.callback_query(F.data.startswith("adminsupportreply:"))
async def start_reply(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    ticket_id = int(callback.data.split(":")[-1])
    await state.update_data(ticket_id=ticket_id)
    await state.set_state(AdminSupportReply.entering_reply)
    await callback.answer()
    await callback.message.answer("Javobingizni yozing:")


@router.message(AdminSupportReply.entering_reply, F.text)
async def submit_reply(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    data = await state.get_data()
    ticket = await support_service.get_ticket(session, data["ticket_id"])
    await state.clear()
    if ticket is None:
        return

    await support_service.add_message(
        session, ticket, text=message.text.strip(), from_admin=True, admin_telegram_id=bot_user.telegram_id
    )
    await message.answer("✅ Javob yuborildi.")

    client = await session.get(BotUser, ticket.bot_user_id)
    if client is None:
        return
    try:
        await message.bot.send_message(
            client.telegram_id, t("support_admin_reply", client.language, text=message.text.strip())
        )
    except TelegramAPIError:
        pass


@router.callback_query(F.data.startswith("adminsupportclose:"))
async def close_ticket(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    ticket_id = int(callback.data.split(":")[-1])
    ticket = await support_service.get_ticket(session, ticket_id)
    if ticket is None:
        await callback.answer("Topilmadi", show_alert=True)
        return
    await support_service.close_ticket(session, ticket)
    await callback.answer("Yopildi ✅")
    await callback.message.edit_reply_markup()
