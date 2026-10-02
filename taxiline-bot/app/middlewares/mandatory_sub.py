from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message, TelegramObject
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n.translations import t
from app.services import groups as groups_service

NOT_SUBSCRIBED_STATUSES = {"left", "kicked"}


async def _missing_targets(bot, session, telegram_id: int) -> list:
    targets = await groups_service.list_mandatory_targets(session)
    missing = []
    for target in targets:
        try:
            member = await bot.get_chat_member(target.chat_id, telegram_id)
            if member.status in NOT_SUBSCRIBED_STATUSES:
                missing.append(target)
        except TelegramBadRequest:
            missing.append(target)
    return missing


def _gate_kb(lang: str, targets: list) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for target in targets:
        link = (target.settings or {}).get("invite_link")
        if link:
            builder.button(text=target.title or link, url=link)
    builder.button(text=t("mandatory_sub_check_btn", lang), callback_data="mandatory_sub:check")
    builder.adjust(1)
    return builder.as_markup()


class MandatorySubMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        bot_user = data.get("bot_user")
        lang = data.get("lang", "uz")

        chat_type = None
        if isinstance(event, Message):
            chat_type = event.chat.type
        elif isinstance(event, CallbackQuery) and event.message:
            chat_type = event.message.chat.type

        is_check_callback = isinstance(event, CallbackQuery) and event.data == "mandatory_sub:check"

        if chat_type != "private" or bot_user is None or bot_user.is_admin or is_check_callback:
            return await handler(event, data)

        session = data["session"]
        bot = data["bot"]
        tg_user = event.from_user
        missing = await _missing_targets(bot, session, tg_user.id)

        if missing:
            text = t("mandatory_sub_text", lang)
            kb = _gate_kb(lang, missing)
            if isinstance(event, Message):
                await event.answer(text, reply_markup=kb)
            elif isinstance(event, CallbackQuery):
                await event.answer()
                await event.message.answer(text, reply_markup=kb)
            return None

        return await handler(event, data)
