from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n.translations import t
from app.keyboards.common import menu_text
from app.services import complaints as complaints_service
from app.services import support as support_service
from app.services import users as users_service
from app.states.support import ComplaintFlow, SupportFlow

router = Router(name="support")


def _support_menu_kb(lang: str):
    builder = InlineKeyboardBuilder()
    builder.button(text=t("support_write_btn", lang), callback_data="support:write")
    builder.button(text=t("complaint_btn", lang), callback_data="support:complaint")
    builder.adjust(1)
    return builder.as_markup()


@router.message(menu_text("menu_support"))
async def open_support(message: Message, bot_user, lang: str) -> None:
    if bot_user is None:
        return
    await message.answer(t("support_menu", lang), reply_markup=_support_menu_kb(lang))


@router.callback_query(F.data == "support:write")
async def start_support_message(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("ask_support_message", lang))
    await state.set_state(SupportFlow.entering_message)


@router.message(SupportFlow.entering_message, F.text)
async def submit_support_message(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    ticket = await support_service.get_or_create_open_ticket(session, bot_user)
    await support_service.add_message(session, ticket, text=message.text, from_admin=False)
    await state.clear()
    await message.answer(t("support_message_sent", lang))

    admins = await users_service.list_admins(session)
    contact = f"@{bot_user.username}" if bot_user.username else bot_user.phone or str(bot_user.telegram_id)
    for admin in admins:
        try:
            await message.bot.send_message(
                admin.telegram_id,
                f"💬 Yangi support xabari — #{ticket.id} ({bot_user.name or contact}):\n\n{message.text}",
            )
        except TelegramAPIError:
            continue


@router.callback_query(F.data == "support:complaint")
async def start_complaint(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("ask_complaint_text", lang))
    await state.set_state(ComplaintFlow.entering_text)


@router.message(ComplaintFlow.entering_text, F.text)
async def submit_complaint(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    complaint = await complaints_service.create(session, bot_user.id, message.text)
    await state.clear()
    await message.answer(t("complaint_sent", lang))

    admins = await users_service.list_admins(session)
    contact = f"@{bot_user.username}" if bot_user.username else bot_user.phone or str(bot_user.telegram_id)
    for admin in admins:
        try:
            await message.bot.send_message(
                admin.telegram_id,
                f"⚠️ Yangi shikoyat — #{complaint.id} ({bot_user.name or contact}):\n\n{message.text}",
            )
        except TelegramAPIError:
            continue
