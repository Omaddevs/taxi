from aiogram import F, Router
from aiogram.types import Message

from app.handlers.start import send_main_menu
from app.keyboards.admin import ADMIN_BACK_BTN, admin_menu_kb
from app.keyboards.common import menu_text

router = Router(name="admin_panel")


@router.message(menu_text("menu_admin"))
async def open_admin_panel(message: Message, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await message.answer("🛠 Admin panel", reply_markup=admin_menu_kb())


@router.message(F.text == ADMIN_BACK_BTN)
async def back_to_main(message: Message, session, bot_user, lang: str) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await send_main_menu(message, session, bot_user, lang)
