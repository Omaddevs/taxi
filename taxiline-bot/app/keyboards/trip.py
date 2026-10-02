from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.cars import CAR_BRANDS
from app.i18n.translations import t

SEAT_LABEL_KEYS = {
    "front": "seat_front",
    "rear_right": "seat_rear_right",
    "rear_left": "seat_rear_left",
    "rear_middle": "seat_rear_middle",
}
LUGGAGE_LABEL_KEYS = {"S": "luggage_small", "M": "luggage_medium", "L": "luggage_large"}


def seat_label(code: str, lang: str) -> str:
    return t(SEAT_LABEL_KEYS.get(code, "seat_front"), lang)


def luggage_label(code: str, lang: str) -> str:
    return t(LUGGAGE_LABEL_KEYS.get(code, "luggage_small"), lang)


def car_brand_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, brand in enumerate(CAR_BRANDS):
        builder.button(text=brand, callback_data=f"trip:car:{i}")
    builder.adjust(2)
    return builder.as_markup()


def driver_car_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, brand in enumerate(CAR_BRANDS):
        builder.button(text=brand, callback_data=f"driver:car:{i}")
    builder.adjust(2)
    return builder.as_markup()


def seat_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code, key in SEAT_LABEL_KEYS.items():
        builder.button(text=t(key, lang), callback_data=f"trip:seat:{code}")
    builder.adjust(1)
    return builder.as_markup()


def passengers_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for n in range(1, 7):
        builder.button(text=str(n), callback_data=f"trip:pax:{n}")
    builder.adjust(3)
    return builder.as_markup()


def luggage_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code, key in LUGGAGE_LABEL_KEYS.items():
        builder.button(text=t(key, lang), callback_data=f"trip:lug:{code}")
    builder.adjust(3)
    return builder.as_markup()


def time_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("time_now", lang), callback_data="trip:time:now")
    builder.adjust(1)
    return builder.as_markup()


def order_confirm_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("order_confirm_btn", lang), callback_data="trip:confirm")
    builder.button(text=t("order_cancel_btn", lang), callback_data="trip:cancel")
    builder.adjust(1)
    return builder.as_markup()


def order_claim_kb(order_id: int, lang: str, show_location: bool = False) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("order_claim_btn", lang), callback_data=f"order:claim:{order_id}")
    if show_location:
        builder.button(text=t("order_location_btn", lang), callback_data=f"order:location:{order_id}")
    builder.adjust(1)
    return builder.as_markup()


def order_enroute_kb(order_id: int, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("order_enroute_btn", lang), callback_data=f"order:enroute:{order_id}")
    builder.button(text=t("order_cancel_claim_btn", lang), callback_data=f"order:cancelclaim:{order_id}")
    builder.adjust(1)
    return builder.as_markup()


def order_complete_kb(order_id: int, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("order_complete_btn", lang), callback_data=f"order:complete:{order_id}")
    builder.button(text=t("order_cancel_claim_btn", lang), callback_data=f"order:cancelclaim:{order_id}")
    builder.adjust(1)
    return builder.as_markup()


def rating_kb(order_id: int, role: str, lang: str) -> InlineKeyboardMarkup:
    """`role` is "p" (passenger rating the driver) or "d" (driver rating the passenger) — kept
    to a single letter so callback_data (rate:{order_id}:{role}:{stars}) stays comfortably
    under Telegram's 64-byte limit even for large order ids."""
    builder = InlineKeyboardBuilder()
    for stars in range(1, 6):
        builder.button(text="⭐️" * stars, callback_data=f"rate:{order_id}:{role}:{stars}")
    builder.adjust(5)
    return builder.as_markup()


def nudge_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("yes", lang), callback_data="trip:nudge:yes")
    builder.button(text=t("no", lang), callback_data="trip:nudge:no")
    builder.adjust(2)
    return builder.as_markup()
