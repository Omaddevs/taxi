from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES, REGIONS


def regions_kb(prefix: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, region in enumerate(REGION_NAMES):
        builder.button(text=region, callback_data=f"{prefix}:r:{i}")
    builder.adjust(1)
    return builder.as_markup()


def driver_region_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, region in enumerate(REGION_NAMES):
        builder.button(text=region, callback_data=f"driverregion:{i}")
    builder.adjust(1)
    return builder.as_markup()


def districts_kb(prefix: str, region_index: int) -> InlineKeyboardMarkup:
    region = REGION_NAMES[region_index]
    builder = InlineKeyboardBuilder()
    for j, district in enumerate(REGIONS[region]):
        builder.button(text=district, callback_data=f"{prefix}:d:{region_index}:{j}")
    builder.adjust(2)
    return builder.as_markup()
