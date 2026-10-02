from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import FSInputFile
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Broadcast, BotUser, DriverProfile
from app.tts.engine import synth


async def resolve_audience(session: AsyncSession, audience_filter: dict) -> list[BotUser]:
    role = audience_filter.get("role")
    region = audience_filter.get("region")

    query = select(BotUser).where(BotUser.blocked.is_(False))
    if role:
        query = query.where(BotUser.role == role)
    if region:
        query = query.join(DriverProfile, DriverProfile.bot_user_id == BotUser.id).where(DriverProfile.region == region)

    result = await session.execute(query)
    return list(result.scalars())


async def send_broadcast(
    bot: Bot,
    session: AsyncSession,
    *,
    admin_telegram_id: int,
    source_chat_id: int,
    source_message_id: int,
    button: dict | None,
    tts_text: str | None,
    audience_filter: dict,
) -> int:
    recipients = await resolve_audience(session, audience_filter)

    kb = None
    if button:
        builder = InlineKeyboardBuilder()
        builder.button(text=button["label"], url=button["url"])
        kb = builder.as_markup()

    sent = 0
    for user in recipients:
        try:
            await bot.copy_message(
                user.telegram_id, from_chat_id=source_chat_id, message_id=source_message_id, reply_markup=kb
            )
            if tts_text:
                path = await synth(tts_text, "uz")
                await bot.send_audio(user.telegram_id, FSInputFile(path))
            sent += 1
        except TelegramAPIError:
            continue

    session.add(
        Broadcast(
            created_by_telegram_id=admin_telegram_id,
            payload={
                "source_chat_id": source_chat_id,
                "source_message_id": source_message_id,
                "button": button,
                "tts": bool(tts_text),
            },
            audience_filter=audience_filter,
            sent_count=sent,
        )
    )
    await session.commit()
    return sent
