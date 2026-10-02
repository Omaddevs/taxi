import time

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (
    CallbackQuery,
    ChatMemberUpdated,
    InlineKeyboardMarkup,
    InlineQuery,
    InlineQueryResultArticle,
    InputTextMessageContent,
    SwitchInlineQueryChosenChat,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Group
from app.services import groups as groups_service

router = Router(name="group_invites")

NOT_MEMBER_STATUSES = ("left", "kicked")
MEMBER_STATUSES = ("member", "restricted", "administrator", "creator")

# chat_id -> monotonic time the gate card was last posted there, so a burst of blocked
# messages from an under-invited member doesn't repost the same card on every keystroke.
_last_gate_sent: dict[int, float] = {}
_GATE_COOLDOWN_SECONDS = 30


def _gate_text(count: int) -> str:
    return (
        "👋 Bu guruhda yozish uchun kamida "
        f"{groups_service.REQUIRED_INVITES} kishi taklif qilishingiz kerak "
        f"({count}/{groups_service.REQUIRED_INVITES} qo'shilgan).\n\n"
        "Quyidagi \"➕ Odam qo'shish\" tugmasi orqali odam taklif qiling, so'ng "
        "\"✅ Qo'shdim\" tugmasini bosing:"
    )


def _gate_kb(group_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text="➕ Odam qo'shish",
        switch_inline_query_chosen_chat=SwitchInlineQueryChosenChat(
            query=f"invite:{group_id}",
            allow_user_chats=True,
            allow_group_chats=True,
        ),
    )
    builder.button(text="✅ Qo'shdim", callback_data=f"groupinvite:check:{group_id}")
    builder.adjust(1)
    return builder.as_markup()


async def send_invite_gate(bot, session, chat_id: int, group_id: int, referrer_telegram_id: int) -> None:
    """Posts the invite-requirement card into `chat_id`, throttled per chat so repeatedly
    blocked messages from the same (or different) under-invited members don't flood it."""
    now = time.monotonic()
    last = _last_gate_sent.get(chat_id)
    if last is not None and now - last < _GATE_COOLDOWN_SECONDS:
        return
    _last_gate_sent[chat_id] = now

    count = await groups_service.count_active_invites(session, group_id, referrer_telegram_id)
    try:
        await bot.send_message(chat_id, _gate_text(count), reply_markup=_gate_kb(group_id))
    except TelegramAPIError:
        pass


@router.chat_member()
async def handle_chat_member_update(update: ChatMemberUpdated, session) -> None:
    group = await groups_service.get_by_chat_id(session, update.chat.id)
    if group is None or not group.settings.get("require_invites"):
        return

    old_status = update.old_chat_member.status
    new_status = update.new_chat_member.status
    member_id = update.new_chat_member.user.id

    joined = old_status in NOT_MEMBER_STATUSES and new_status in ("member", "restricted")
    left = old_status in MEMBER_STATUSES and new_status in NOT_MEMBER_STATUSES

    if joined:
        link = update.invite_link
        if link is not None:
            invite_row = await groups_service.get_invite_link_by_url(session, link.invite_link)
            if invite_row is not None:
                await groups_service.record_invite_join(
                    session,
                    group_id=group.id,
                    referrer_telegram_id=invite_row.referrer_telegram_id,
                    joined_telegram_id=member_id,
                )

        if not update.new_chat_member.user.is_bot and not await groups_service.has_met_invite_requirement(
            session, group.id, member_id
        ):
            await send_invite_gate(update.bot, session, update.chat.id, group.id, member_id)
    elif left:
        await groups_service.record_invite_leave(session, group_id=group.id, joined_telegram_id=member_id)


@router.callback_query(F.data.startswith("groupinvite:check:"))
async def check_invites(callback: CallbackQuery, session) -> None:
    group_id = int(callback.data.split(":")[-1])
    group = await session.get(Group, group_id)
    if group is None:
        await callback.answer()
        return

    count = await groups_service.count_active_invites(session, group.id, callback.from_user.id)
    if count >= groups_service.REQUIRED_INVITES:
        await callback.answer("✅ Rahmat! Endi guruhga yozishingiz mumkin.", show_alert=True)
    else:
        remaining = groups_service.REQUIRED_INVITES - count
        await callback.answer(
            f"Hali yetarli emas: {count}/{groups_service.REQUIRED_INVITES}. "
            f"Yana {remaining} kishi taklif qiling.",
            show_alert=True,
        )


@router.inline_query()
async def share_invite_link(inline_query: InlineQuery, session) -> None:
    payload = inline_query.query or ""
    if not payload.startswith("invite:"):
        return

    try:
        group_id = int(payload.split(":", 1)[1])
    except ValueError:
        return

    group = await session.get(Group, group_id)
    if group is None:
        return

    link = await groups_service.get_or_create_invite_link(session, inline_query.bot, group, inline_query.from_user.id)
    text = f"🚕 {group.title or 'Guruh'}ga qo'shiling:\n{link.invite_link}"

    result = InlineQueryResultArticle(
        id=f"invite-{group.id}-{inline_query.from_user.id}",
        title="Guruhga taklif havolasi",
        description=group.title,
        input_message_content=InputTextMessageContent(message_text=text),
    )
    await inline_query.answer([result], cache_time=1, is_personal=True)
