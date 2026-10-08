from aiogram import F
from aiogram.types import InlineKeyboardMarkup, ReplyKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

from app.config import settings
from app.i18n.translations import LANG_LABELS, LANGS, t


def menu_text(key: str):
    """A magic filter matching a reply-keyboard button's text in any of the 3 languages —
    since the same logical button renders as different text per user."""
    return F.text.in_({t(key, lang) for lang in LANGS})


def language_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for lang in LANGS:
        builder.button(text=LANG_LABELS[lang], callback_data=f"lang:{lang}")
    builder.adjust(1)
    return builder.as_markup()


def yes_no_kb(lang: str, yes_cb: str, no_cb: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("yes", lang), callback_data=yes_cb)
    builder.button(text=t("no", lang), callback_data=no_cb)
    builder.adjust(2)
    return builder.as_markup()


def share_phone_kb(lang: str) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=t("share_phone_btn", lang), request_contact=True)
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


def share_location_kb(lang: str) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=t("share_location_btn", lang), request_location=True)
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


def main_menu_kb(lang: str, webapp_code: str | None, is_admin: bool) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=t("menu_start_trip", lang))
    builder.button(text=t("menu_rent", lang))
    builder.button(text=t("menu_women_trip", lang))
    webapp_url = f"{settings.webapp_url}?tgc={webapp_code}" if webapp_code else settings.webapp_url
    if webapp_url.startswith("https://"):
        builder.button(text=t("menu_webapp", lang), web_app=WebAppInfo(url=webapp_url))
    else:
        # Telegram rejects a keyboard's web_app button outright (400 Bad Request) unless its
        # URL is HTTPS — and that failure takes the ENTIRE reply keyboard down with it, not
        # just this one button. Fall back to a plain text button (handlers/main_menu.py sends
        # the link as a tappable message instead) so a non-HTTPS WEBAPP_URL — e.g. local dev —
        # can never break the rest of the main menu.
        builder.button(text=t("menu_webapp", lang))
    builder.button(text=t("menu_support", lang))
    builder.button(text=t("menu_become_driver", lang))
    builder.button(text=t("menu_my_trips", lang))
    builder.button(text=t("menu_profile", lang))
    builder.button(text=t("menu_settings", lang))
    if is_admin:
        builder.button(text=t("menu_admin", lang))
    builder.adjust(2, 2, 2, 2, 2)
    return builder.as_markup(resize_keyboard=True)


def driver_menu_kb(lang: str, webapp_code: str | None, is_admin: bool) -> ReplyKeyboardMarkup:
    """Shown instead of main_menu_kb to an APPROVED driver — passenger-oriented buttons
    (Safarni boshlash, Safarlarim, the passenger Profil) are deliberately left out so an
    approved driver isn't shown options meant for ordering a ride."""
    builder = ReplyKeyboardBuilder()
    webapp_url = f"{settings.webapp_url}?tgc={webapp_code}" if webapp_code else settings.webapp_url
    if webapp_url.startswith("https://"):
        builder.button(text=t("menu_webapp", lang), web_app=WebAppInfo(url=webapp_url))
    else:
        builder.button(text=t("menu_webapp", lang))
    builder.button(text=t("menu_driver_open_orders", lang))
    builder.button(text=t("menu_driver_profile", lang))
    builder.button(text=t("menu_support", lang))
    builder.button(text=t("menu_settings", lang))
    if is_admin:
        builder.button(text=t("menu_admin", lang))
    builder.adjust(2, 2, 1)
    return builder.as_markup(resize_keyboard=True)
