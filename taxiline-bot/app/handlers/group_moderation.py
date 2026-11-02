from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message

from app.services import groups as groups_service
from app.services import moderation as moderation_service

router = Router(name="group_moderation")


# Yangi xabarlar GroupGuardMiddleware'da tekshiriladi. Bu yerda — tahrirlangan xabar: oddiy matn
# yozib, keyin unga havola qo'shib qo'yish yo'lini yopadi.
@router.edited_message(F.chat.type.in_({"group", "supergroup"}))
async def moderate_edited(message: Message, session) -> None:
    if message.from_user is None:
        return
    group = await groups_service.get_by_chat_id(session, message.chat.id)
    if group is None or not groups_service.setting(group.settings, "strict_moderation"):
        return
    if message.sender_chat is not None:
        # Anonim admin (guruhning o'zi) yoki bog'langan kanal — tekshirilmaydi.
        if message.sender_chat.id == message.chat.id or message.is_automatic_forward:
            return
    else:
        try:
            member = await message.bot.get_chat_member(message.chat.id, message.from_user.id)
        except TelegramBadRequest:
            return
        if member.status in ("administrator", "creator"):
            return
    await moderation_service.enforce(message.bot, message)
