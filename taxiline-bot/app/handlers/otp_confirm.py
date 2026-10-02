from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.i18n.translations import t
from app.services.backend_client import backend_client

router = Router(name="otp_confirm")


@router.callback_query(F.data.startswith("otpconfirm:"))
async def confirm_otp(callback: CallbackQuery, lang: str) -> None:
    _, phone, code = callback.data.split(":", 2)

    ok = await backend_client.confirm_otp(phone, code)
    await callback.answer()

    if ok:
        await callback.message.edit_text(t("otp_confirmed", lang))
    else:
        await callback.message.edit_text(t("otp_confirm_failed", lang))
