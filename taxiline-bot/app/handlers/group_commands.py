"""In-group admin commands — /guruh (alias /admin, /settings) opens the group's settings panel
right inside the group, /delete switches off every service currently enabled there.

Only the group's own admins (creator/administrators, including anonymous admins posting as
the group) and the bot's global admins may use them. A group the bot doesn't know yet is
registered on the spot as a MAIN group, so the commands work the moment the bot is made an
admin — the admin panel can still change its kind/region later.
"""

import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.handlers.admin.groups import SETTING_LABELS
from app.services import groups as groups_service

logger = logging.getLogger(__name__)

router = Router(name="group_commands")
router.message.filter(F.chat.type.in_({"group", "supergroup"}))

ADMIN_STATUSES = ("creator", "administrator")
KIND_LABELS = {
    "MAIN": "Ochiq/umumiy guruh",
    "CLOSED": "Yopiq haydovchilar guruhi",
    "ROUTE": "Yo'nalish (topic) guruhi",
}
# Rights the bot needs for the group services to actually work (deleting spam/join messages,
# creating invite links for drivers).
REQUIRED_BOT_RIGHTS = {
    "can_delete_messages": "xabarlarni o'chirish",
    "can_invite_users": "foydalanuvchilarni taklif qilish",
}


async def _is_chat_admin(bot: Bot, chat_id: int, user_id: int) -> bool:
    try:
        member = await bot.get_chat_member(chat_id, user_id)
    except TelegramAPIError:
        return False
    return member.status in ADMIN_STATUSES


async def _message_from_admin(message: Message, bot_user) -> bool:
    # Anonymous admins post as the group itself; their from_user is the GroupAnonymousBot.
    if message.sender_chat is not None and message.sender_chat.id == message.chat.id:
        return True
    if bot_user is not None and bot_user.is_admin:
        return True
    if message.from_user is None:
        return False
    return await _is_chat_admin(message.bot, message.chat.id, message.from_user.id)


async def _missing_bot_rights(bot: Bot, chat_id: int) -> list[str] | None:
    """None if the bot isn't an admin at all, else the human-readable rights it lacks."""
    try:
        me = await bot.get_chat_member(chat_id, bot.id)
    except TelegramAPIError:
        return None
    if me.status != "administrator":
        return None
    return [label for right, label in REQUIRED_BOT_RIGHTS.items() if not getattr(me, right, False)]


async def _get_or_register(session, message: Message):
    group = await groups_service.get_by_chat_id(session, message.chat.id)
    if group is not None:
        if message.chat.title and group.title != message.chat.title:
            await groups_service.update_group(session, group, title=message.chat.title)
        return group
    added_by = message.from_user.id if message.from_user else 0
    return await groups_service.register_group(
        session,
        chat_id=message.chat.id,
        title=message.chat.title,
        kind="MAIN",
        region=None,
        added_by_telegram_id=added_by,
    )


def _panel_text(group, rights_warning: str | None) -> str:
    settings = group.settings or {}
    enabled = [label for key, label in SETTING_LABELS.items() if settings.get(key)]
    lines = [
        f"⚙️ Guruh sozlamalari: {group.title or group.chat_id}",
        f"Turi: {KIND_LABELS.get(group.kind, group.kind)}",
    ]
    if group.region:
        lines.append(f"Viloyat: {group.region}")
    lines.append("")
    lines.append(f"Yoqilgan xizmatlar: {len(enabled)} ta" if enabled else "Yoqilgan xizmat yo'q.")
    lines.append("Tugmani bosib yoqing/o'chiring.")
    if group.kind == "MAIN" and settings.get("restrict_non_admin_posts"):
        lines.append("\nℹ️ \"Faqat adminlar yoza oladi\" faqat yopiq haydovchilar guruhida ishlaydi.")
    if rights_warning:
        lines.append(f"\n{rights_warning}")
    return "\n".join(lines)


def _panel_kb(group):
    settings = group.settings or {}
    builder = InlineKeyboardBuilder()
    for key, label in SETTING_LABELS.items():
        icon = "✅" if settings.get(key) else "⬜️"
        builder.button(text=f"{icon} {label}", callback_data=f"grpset:t:{key}")
    builder.button(text="🚫 Hammasini o'chirish", callback_data="grpset:off")
    builder.button(text="✖️ Yopish", callback_data="grpset:close")
    builder.adjust(1)
    return builder.as_markup()


async def _rights_warning(bot: Bot, chat_id: int) -> str | None:
    missing = await _missing_bot_rights(bot, chat_id)
    if missing is None:
        return "⚠️ Bot bu guruhda admin emas — xizmatlar ishlashi uchun botni admin qiling."
    if missing:
        return "⚠️ Botga quyidagi huquqlarni bering: " + ", ".join(missing) + "."
    return None


@router.message(Command("guruh", "admin", "settings"))
async def group_settings_command(message: Message, session, bot_user) -> None:
    if not await _message_from_admin(message, bot_user):
        await message.reply("⛔️ Bu buyruq faqat guruh adminlari uchun.")
        return

    group = await _get_or_register(session, message)
    warning = await _rights_warning(message.bot, message.chat.id)
    await message.reply(_panel_text(group, warning), reply_markup=_panel_kb(group))


@router.message(Command("delete"))
async def group_disable_all_command(message: Message, session, bot_user) -> None:
    if not await _message_from_admin(message, bot_user):
        await message.reply("⛔️ Bu buyruq faqat guruh adminlari uchun.")
        return

    group = await groups_service.get_by_chat_id(session, message.chat.id)
    enabled = [key for key in SETTING_LABELS if group is not None and (group.settings or {}).get(key)]
    if not enabled:
        await message.reply("ℹ️ Bu guruhda yoqilgan xizmat yo'q.")
        return

    await groups_service.update_settings(session, group, **{key: False for key in enabled})
    names = "\n".join(f"• {SETTING_LABELS[key]}" for key in enabled)
    await message.reply(f"✅ Quyidagi xizmatlar o'chirildi:\n{names}")


@router.callback_query(F.data.startswith("grpset:"))
async def group_settings_callback(callback: CallbackQuery, session, bot_user) -> None:
    message = callback.message
    if message is None or message.chat.type not in ("group", "supergroup"):
        await callback.answer()
        return

    allowed = (bot_user is not None and bot_user.is_admin) or await _is_chat_admin(
        callback.bot, message.chat.id, callback.from_user.id
    )
    if not allowed:
        await callback.answer("⛔️ Faqat guruh adminlari o'zgartira oladi.", show_alert=True)
        return

    action = callback.data.split(":")
    if action[1] == "close":
        await callback.answer()
        try:
            await message.delete()
        except TelegramAPIError:
            await message.edit_reply_markup()
        return

    group = await groups_service.get_by_chat_id(session, message.chat.id)
    if group is None:
        await callback.answer("Guruh topilmadi — /guruh buyrug'ini qayta yuboring.", show_alert=True)
        return

    if action[1] == "off":
        await groups_service.update_settings(session, group, **{key: False for key in SETTING_LABELS})
        await callback.answer("Barcha xizmatlar o'chirildi ✅")
    elif action[1] == "t" and len(action) == 3 and action[2] in SETTING_LABELS:
        key = action[2]
        new_value = not (group.settings or {}).get(key, False)
        await groups_service.update_settings(session, group, **{key: new_value})
        await callback.answer(("✅ Yoqildi: " if new_value else "⬜️ O'chirildi: ") + SETTING_LABELS[key])
    else:
        await callback.answer()
        return

    warning = await _rights_warning(callback.bot, message.chat.id)
    try:
        await message.edit_text(_panel_text(group, warning), reply_markup=_panel_kb(group))
    except TelegramAPIError:
        pass  # "message is not modified" — nothing to redraw


@router.message(F.migrate_to_chat_id)
async def group_migrated(message: Message, session) -> None:
    """A group upgraded to a supergroup gets a new chat id — carry its settings over so the
    commands and order dispatch keep working there."""
    group = await groups_service.get_by_chat_id(session, message.chat.id)
    if group is None:
        return
    if await groups_service.get_by_chat_id(session, message.migrate_to_chat_id) is not None:
        return
    await groups_service.update_group(session, group, chat_id=message.migrate_to_chat_id)
    logger.info("group %s migrated %s -> %s", group.id, message.chat.id, message.migrate_to_chat_id)
