"""Random mijoz — the landing page's giveaway. The site form ends with a deep link
`t.me/<bot>?start=gw_<token>`; tapping it links the entry to this Telegram account (one account
per entry, enforced on server/) and shows the channel/group subscription status with a
"Qayta tekshirish" button. Membership itself is checked by server/ through /webapp/chat-members."""

import html
import logging

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n.translations import t
from app.services.backend_client import backend_client

logger = logging.getLogger(__name__)

router = Router()

RECHECK_CB = "gw:recheck"


def _mark(value) -> str:
    return "✅" if value else "❌"


def _status_text(status: dict, lang: str) -> str:
    settings = status.get("settings") or {}
    requires = settings.get("requires") or {}
    lines = [
        t(
            "gw_header",
            lang,
            title=html.escape(settings.get("title") or "Random mijoz"),
            name=html.escape(status.get("firstName") or ""),
        ),
        "",
        f"{_mark(status.get('linked'))} {t('gw_linked', lang)}",
    ]
    if requires.get("channel"):
        lines.append(f"{_mark(status.get('channelMember'))} {t('gw_channel', lang)}")
    if requires.get("group"):
        lines.append(f"{_mark(status.get('groupMember'))} {t('gw_group', lang)}")
    lines.append("")
    if status.get("eligible"):
        lines.append(t("gw_eligible", lang))
        lines.append("")
        lines.append(t("gw_unsub_warning", lang))
    else:
        lines.append(t("gw_not_yet", lang))
    return "\n".join(lines)


def _status_kb(status: dict, lang: str) -> InlineKeyboardMarkup:
    settings = status.get("settings") or {}
    builder = InlineKeyboardBuilder()
    if settings.get("channelUrl") and not status.get("channelMember"):
        builder.button(text=t("gw_channel_btn", lang), url=settings["channelUrl"])
    if settings.get("groupUrl") and not status.get("groupMember"):
        builder.button(text=t("gw_group_btn", lang), url=settings["groupUrl"])
    builder.button(text=t("gw_recheck_btn", lang), callback_data=RECHECK_CB)
    builder.adjust(1)
    return builder.as_markup()


def _error_key(code: int) -> str:
    return {404: "gw_not_found", 409: "gw_conflict"}.get(code, "service_unavailable")


async def handle_deep_link(message: Message, token: str, lang: str) -> None:
    tg = message.from_user
    try:
        code, body = await backend_client.giveaway_link(token, tg.id, tg.username)
    except Exception:  # network / server down
        logger.exception("giveaway link failed")
        await message.answer(t("service_unavailable", lang))
        return
    if code != 200:
        await message.answer(t(_error_key(code), lang))
        return
    await message.answer(_status_text(body, lang), reply_markup=_status_kb(body, lang), parse_mode="HTML")


@router.callback_query(F.data == RECHECK_CB)
async def recheck(callback: CallbackQuery, lang: str) -> None:
    try:
        code, body = await backend_client.giveaway_recheck(callback.from_user.id)
    except Exception:
        logger.exception("giveaway recheck failed")
        await callback.answer(t("service_unavailable", lang), show_alert=True)
        return
    if code != 200:
        await callback.answer(t(_error_key(code), lang), show_alert=True)
        return
    await callback.answer()
    try:
        await callback.message.edit_text(_status_text(body, lang), reply_markup=_status_kb(body, lang), parse_mode="HTML")
    except TelegramBadRequest:
        # "message is not modified" — status unchanged since the last check.
        pass
