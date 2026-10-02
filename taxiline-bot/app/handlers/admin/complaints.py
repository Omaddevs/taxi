from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import BotUser
from app.i18n.translations import t
from app.keyboards.admin import ADMIN_COMPLAINTS_BTN
from app.services import complaints as complaints_service
from app.states.admin_broadcast import AdminComplaintReply

router = Router(name="admin_complaints")


def _reply_kb(complaint_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="✍️ Javob berish", callback_data=f"admincomplaintreply:{complaint_id}")
    return builder.as_markup()


@router.message(F.text == ADMIN_COMPLAINTS_BTN)
async def list_complaints(message: Message, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    complaints = await complaints_service.list_open(session)
    if not complaints:
        await message.answer("Ochiq shikoyatlar yo'q.")
        return

    for complaint in complaints:
        client = await session.get(BotUser, complaint.bot_user_id)
        who = client.name if client else "—"
        await message.answer(
            f"⚠️ Shikoyat #{complaint.id} — {who}\n\n{complaint.text}", reply_markup=_reply_kb(complaint.id)
        )


@router.callback_query(F.data.startswith("admincomplaintreply:"))
async def start_reply(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    complaint_id = int(callback.data.split(":")[-1])
    await state.update_data(complaint_id=complaint_id)
    await state.set_state(AdminComplaintReply.entering_reply)
    await callback.answer()
    await callback.message.answer("Javobingizni yozing:")


@router.message(AdminComplaintReply.entering_reply, F.text)
async def submit_reply(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    data = await state.get_data()
    complaint = await complaints_service.get(session, data["complaint_id"])
    await state.clear()
    if complaint is None:
        return

    await complaints_service.update_status(session, complaint, status="RESOLVED", reply=message.text.strip())
    await message.answer("✅ Javob yuborildi.")

    client = await session.get(BotUser, complaint.bot_user_id)
    if client is None:
        return
    try:
        await message.bot.send_message(
            client.telegram_id,
            t("complaint_status_update", client.language, status="Ko'rib chiqildi", reply=message.text.strip()),
        )
    except TelegramAPIError:
        pass
