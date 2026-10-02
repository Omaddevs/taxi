from aiogram.types import InlineKeyboardMarkup, ReplyKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

ADMIN_GROUPS_BTN = "👥 Guruhlar"
ADMIN_DRIVERS_BTN = "🚗 Haydovchilar"
ADMIN_CLIENTS_BTN = "🙍 Mijozlar"
ADMIN_BROADCAST_BTN = "📢 E'lon yuborish"
ADMIN_COMPLAINTS_BTN = "⚠️ Shikoyatlar"
ADMIN_SUPPORT_BTN = "💬 Support"
ADMIN_STATS_BTN = "📊 Statistika"
ADMIN_ADMINS_BTN = "👑 Adminlar"
ADMIN_SUBSCRIPTIONS_BTN = "📋 Obunalar"
ADMIN_BACK_BTN = "⬅️ Asosiy menyu"


def admin_menu_kb() -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    for text in (
        ADMIN_GROUPS_BTN,
        ADMIN_DRIVERS_BTN,
        ADMIN_CLIENTS_BTN,
        ADMIN_SUBSCRIPTIONS_BTN,
        ADMIN_BROADCAST_BTN,
        ADMIN_COMPLAINTS_BTN,
        ADMIN_SUPPORT_BTN,
        ADMIN_STATS_BTN,
        ADMIN_ADMINS_BTN,
        ADMIN_BACK_BTN,
    ):
        builder.button(text=text)
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


def confirm_cancel_kb(confirm_cb: str, cancel_cb: str, confirm_text="✅ Tasdiqlash", cancel_text="❌ Bekor qilish") -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=confirm_text, callback_data=confirm_cb)
    builder.button(text=cancel_text, callback_data=cancel_cb)
    builder.adjust(2)
    return builder.as_markup()
