from aiogram import Router
from aiogram.types import Message

from app.handlers.settings import profile_edit_kb
from app.i18n.translations import t
from app.keyboards.common import menu_text
from app.services.phone import format_phone

router = Router(name="profile")


@router.message(menu_text("menu_profile"))
async def open_profile(message: Message, bot_user, lang: str) -> None:
    if bot_user is None:
        return

    text = t(
        "profile_text",
        lang,
        name=bot_user.name or t("not_set", lang),
        username=f"@{bot_user.username}" if bot_user.username else t("not_set", lang),
        phone=format_phone(bot_user.phone) if bot_user.phone else t("not_set", lang),
        address=bot_user.address or t("not_set", lang),
        trips_count=bot_user.trips_count,
        id=bot_user.telegram_id,
    )
    await message.answer(text)
    await message.answer(t("profile_edit_hint", lang), reply_markup=profile_edit_kb(lang))
