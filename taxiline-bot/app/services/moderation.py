"""Guruhlarda taqiqlangan kontent: oddiy a'zo (admin emas) yuborsa — xabar o'chiriladi va
yuborgan kishi shu guruhdan butunlay chiqarib yuboriladi (ban, xabarlari ham o'chadi).

Taqiqlanganlar (18+ va reklama tarqatuvchilar shu yo'llardan foydalanadi):
* boshqa chat/kanaldan forward qilingan xabar;
* video, GIF (animation), dumaloq video, video-fayl va story;
* havola: http(s)://, www., t.me/…, sayt domeni (example.com) yoki yashirin havola (text_link);
* havolali tugmalar (inline keyboard) va inline-bot orqali yuborilgan xabar.

Rasm, matn, ovozli xabar, stiker va @username (haydovchi bilan bog'lanish uchun) ruxsat etiladi.
Adminlar va guruhning o'z kanali bu tekshiruvdan o'tmaydi — chaqiruvchi (GroupGuardMiddleware)
ularni oldinroq ajratib oladi. `strict_moderation` sozlamasi guruh uchun o'chirilsa, ishlamaydi."""

import logging
import re

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message

log = logging.getLogger(__name__)

# Sayt domeni: so'z.zona (example.com, site.uz, bit.ly/...) — telefon raqami va oddiy nuqtali
# matnni ("soat 9.30", "Toshkent.") ushlamasligi uchun zona ro'yxati yopiq.
_LINK_RE = re.compile(
    r"(https?://|www\.|\bt\.me/|\btelegram\.(me|dog)/|\btg://"
    r"|\b[a-z0-9][a-z0-9-]*\.(com|net|org|ru|uz|me|io|ly|gg|xyz|info|top|site|online|link|club|app|pro|live|tv|cc|biz|store|shop|click|fun|space|website|vip|porn|sex|xxx|onlyfans)\b)",
    re.IGNORECASE,
)

_LINK_ENTITIES = {"url", "text_link"}


def violation(message: Message) -> str | None:
    """Xabar nima uchun taqiqlanganini qaytaradi (log uchun), yoki None — ruxsat etilgan."""
    if message.forward_origin is not None:
        return "forward"
    if message.story is not None:
        return "story"
    if message.video or message.animation or message.video_note:
        return "video"
    if message.document and (message.document.mime_type or "").startswith("video/"):
        return "video"
    if message.via_bot is not None:
        return "inline bot"
    markup = message.reply_markup
    if markup is not None and getattr(markup, "inline_keyboard", None):
        if any(button.url for row in markup.inline_keyboard for button in row):
            return "link button"
    entities = (message.entities or []) + (message.caption_entities or [])
    if any(entity.type in _LINK_ENTITIES for entity in entities):
        return "link"
    text = message.text or message.caption or ""
    if text and _LINK_RE.search(text):
        return "link"
    return None


async def enforce(bot: Bot, message: Message) -> bool:
    """Taqiqlangan bo'lsa: xabarni o'chiradi, yuboruvchini ban qiladi va True qaytaradi."""
    reason = violation(message)
    if reason is None:
        return False

    chat_id = message.chat.id
    try:
        await bot.delete_message(chat_id, message.message_id)
    except TelegramAPIError:
        pass

    try:
        if message.sender_chat is not None:
            # O'z kanali nomidan yozgan — kanalning o'zi guruhda yozolmaydigan qilinadi.
            await bot.ban_chat_sender_chat(chat_id, message.sender_chat.id)
            who = f"chat {message.sender_chat.id}"
        else:
            # revoke_messages — shu kishining guruhdagi avvalgi xabarlari ham o'chadi.
            await bot.ban_chat_member(chat_id, message.from_user.id, revoke_messages=True)
            who = f"user {message.from_user.id}"
        log.info("moderation: banned %s in %s (%s)", who, chat_id, reason)
    except TelegramAPIError as exc:
        # Botda "a'zolarni bloklash" huquqi bo'lmasa — xabar baribir o'chirilgan.
        log.warning("moderation: could not ban in %s (%s): %s", chat_id, reason, exc)
    return True
