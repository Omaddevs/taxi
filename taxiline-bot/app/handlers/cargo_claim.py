"""The "✅ Qabul qilish" / "✅ Yetkazildi" buttons on website cargo orders (see services/cargo.py).
The order lives on server/, so every tap goes through backend_client; the server tells the bot
back (/webapp/cargo-status) to relabel the other copies."""

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.types import CallbackQuery

from app.services import cargo as cargo_service
from app.services import drivers as drivers_service
from app.services.backend_client import backend_client

router = Router(name="cargo_claim")


def _error_text(status: int, body: dict | None) -> str:
    message = ((body or {}).get("error") or {}).get("message") if isinstance(body, dict) else None
    if status == 409:
        return message or "Bu yuk allaqachon band qilingan."
    if status in (403, 404) and message:
        return message
    return "Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring."


@router.callback_query(F.data.startswith("cargoclaim:"))
async def claim(callback: CallbackQuery, session, bot_user) -> None:
    cargo_id = callback.data.split(":", 1)[1]
    driver = await drivers_service.get_by_bot_user(session, bot_user.id) if bot_user else None
    if driver is None or driver.status != "APPROVED" or driver.blocked:
        await callback.answer("Bu amal faqat tasdiqlangan haydovchilar uchun.", show_alert=True)
        return

    status, body = await backend_client.cargo_action("claim", cargo_id, bot_user.telegram_id)
    if status != 200 or not isinstance(body, dict):
        await callback.answer(_error_text(status, body), show_alert=True)
        return

    full = cargo_service.render_full_card(body)
    in_private = callback.message is not None and callback.message.chat.type == "private"
    if in_private:
        try:
            await callback.message.edit_text(full, reply_markup=cargo_service.done_kb(cargo_id), parse_mode="HTML")
        except TelegramAPIError:
            pass
        await callback.answer("✅ Yuk sizga biriktirildi")
        return

    # Taken from a group: the group post was already relabelled "Band qilindi" by the server's
    # status callback; the details go to the driver privately.
    try:
        await callback.bot.send_message(bot_user.telegram_id, full, reply_markup=cargo_service.done_kb(cargo_id), parse_mode="HTML")
        await callback.answer("✅ Yuk sizga biriktirildi. Tafsilotlar shaxsiy xabarda.", show_alert=True)
    except TelegramAPIError:
        await callback.answer(
            "✅ Yuk sizga biriktirildi. Tafsilotlarni olish uchun botga /start yozing yoki saytdagi «Yuklar» bo'limini oching.",
            show_alert=True,
        )


@router.callback_query(F.data.startswith("cargodone:"))
async def done(callback: CallbackQuery, bot_user) -> None:
    cargo_id = callback.data.split(":", 1)[1]
    if bot_user is None:
        await callback.answer()
        return

    status, body = await backend_client.cargo_action("complete", cargo_id, bot_user.telegram_id)
    if status != 200:
        await callback.answer(_error_text(status, body), show_alert=True)
        return

    try:
        await callback.message.edit_text(cargo_service.render_full_card(body, delivered=True), parse_mode="HTML")
    except (TelegramAPIError, AttributeError):
        pass
    await callback.answer("✅ Rahmat! Yuk yetkazildi deb belgilandi.")
