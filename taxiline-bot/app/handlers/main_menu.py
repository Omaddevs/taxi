from datetime import timedelta

from aiogram import Router
from aiogram.types import Message

from app.config import settings
from app.i18n.translations import t
from app.keyboards.common import menu_text
from app.services.backend_client import backend_client
from app.services.trips import list_my_trips, status_label

router = Router(name="main_menu")


@router.message(menu_text("menu_webapp"))
async def open_webapp_fallback(message: Message, bot_user, lang: str) -> None:
    # Only reachable when WEBAPP_URL isn't HTTPS — see keyboards/common.py main_menu_kb. With
    # a real HTTPS URL this text never matches anything (the button opens the WebApp directly
    # instead of sending a message), so this handler is a no-op in production.
    if bot_user is None or settings.webapp_url.startswith("https://"):
        return
    code = await backend_client.telegram_login_token(bot_user.telegram_id)
    url = f"{settings.webapp_url}?tgc={code}" if code else settings.webapp_url
    await message.answer(url)


@router.message(menu_text("menu_my_trips"))
async def my_trips(message: Message, session, bot_user, lang: str) -> None:
    if bot_user is None:
        return

    trips = await list_my_trips(session, bot_user)
    if not trips:
        await message.answer(t("my_trips_empty", lang))
        return

    for order in trips:
        await message.answer(
            t(
                "my_trips_item",
                lang,
                id=order.id,
                from_region=order.from_region,
                to_region=order.to_region,
                status=status_label(order, lang) if order.status == "OPEN" else order.status,
                created_at=(order.created_at + timedelta(hours=5)).strftime("%Y-%m-%d %H:%M"),  # UTC -> Tashkent
            )
        )
