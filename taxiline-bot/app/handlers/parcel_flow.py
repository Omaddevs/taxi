"""«📦 Pochta jo'natish»: the sender answers a few questions in the bot and the parcel becomes a
cargo order on server/ — the same order as the website's «Yetkazish», so it reaches the closed
driver group(s) of the chosen route (services/cargo.py dispatch), drivers take it with the
«✅ Qabul qilish» button and the sender gets the driver's name and phone here in the bot."""

import html

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES, REGIONS
from app.handlers.start import send_main_menu
from app.i18n.translations import t
from app.keyboards.common import menu_text
from app.keyboards.regions import districts_kb, regions_kb
from app.services import groups as groups_service
from app.services.backend_client import backend_client
from app.services.phone import format_phone, normalize_phone
from app.states.parcel import ParcelOrder

router = Router(name="parcel_flow")

# Same ids, weights and price formula as the website (apps/web/src/pages/Cargo.jsx), so a parcel
# costs the same whichever way it was sent. Intercity parcels go by car.
PARCEL_TYPES = ("parcel", "docs", "shopping", "tech", "clothes", "food", "flowers", "other")
WEIGHTS = ("1 kg", "5 kg", "10 kg", "20 kg+")
BASE_BY_WEIGHT = {"1 kg": 15000, "5 kg": 25000, "10 kg": 40000, "20 kg+": 60000}
CAR_FACTOR = 1.6
INTERCITY_EXTRA = 40000
MIN_PRICE, MAX_PRICE = 5000, 5_000_000


def _som(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " so'm"


def suggested_price(weight: str, same_region: bool) -> int:
    total = BASE_BY_WEIGHT[weight] * CAR_FACTOR + (0 if same_region else INTERCITY_EXTRA)
    return int(round(total / 1000) * 1000)


def _types_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code in PARCEL_TYPES:
        builder.button(text=t(f"parcel_type_{code}", lang), callback_data=f"parcel:type:{code}")
    builder.adjust(2)
    return builder.as_markup()


def _weights_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, weight in enumerate(WEIGHTS):
        builder.button(text=weight, callback_data=f"parcel:w:{i}")
    builder.adjust(4)
    return builder.as_markup()


def _skip_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("parcel_skip_btn", lang), callback_data="parcel:note:skip")
    return builder.as_markup()


def _price_kb(lang: str, suggested: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    options = sorted({p for p in (suggested - 5000, suggested, suggested + 5000, suggested + 10000) if p >= MIN_PRICE})
    for price in options:
        label = f"⭐ {_som(price)}" if price == suggested else _som(price)
        builder.button(text=label, callback_data=f"parcel:price:{price}")
    builder.button(text=t("parcel_price_other_btn", lang), callback_data="parcel:price:other")
    builder.adjust(2, 2, 1)
    return builder.as_markup()


def _confirm_kb(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("parcel_send_btn", lang), callback_data="parcel:send")
    builder.button(text=t("parcel_cancel_btn", lang), callback_data="parcel:cancel")
    builder.adjust(1)
    return builder.as_markup()


def _place(region: str, district: str) -> str:
    return region if district == region else f"{district}, {region}"


# ── Start ────────────────────────────────────────────────────────────────────────────────────


@router.message(menu_text("menu_parcel"))
async def start_parcel(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    if bot_user is None:
        return
    await state.clear()
    if not bot_user.phone:
        await message.answer(t("parcel_no_phone", lang))
        return
    await message.answer(t("parcel_intro", lang))
    await message.answer(t("parcel_ask_from_region", lang), reply_markup=regions_kb("pfrom"))
    await state.set_state(ParcelOrder.choosing_from_region)


# ── Route ────────────────────────────────────────────────────────────────────────────────────


@router.callback_query(ParcelOrder.choosing_from_region, F.data.startswith("pfrom:r:"))
async def pick_from_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    region = REGION_NAMES[idx]
    await state.update_data(from_region=region)
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_from_district", lang, region=region), reply_markup=districts_kb("pfrom", idx))
    await state.set_state(ParcelOrder.choosing_from_district)


@router.callback_query(ParcelOrder.choosing_from_district, F.data.startswith("pfrom:d:"))
async def pick_from_district(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    _, _, ridx, didx = callback.data.split(":")
    region = REGION_NAMES[int(ridx)]
    await state.update_data(from_district=REGIONS[region][int(didx)])
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_to_region", lang), reply_markup=regions_kb("pto"))
    await state.set_state(ParcelOrder.choosing_to_region)


@router.callback_query(ParcelOrder.choosing_to_region, F.data.startswith("pto:r:"))
async def pick_to_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    region = REGION_NAMES[idx]
    await state.update_data(to_region=region)
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_to_district", lang, region=region), reply_markup=districts_kb("pto", idx))
    await state.set_state(ParcelOrder.choosing_to_district)


@router.callback_query(ParcelOrder.choosing_to_district, F.data.startswith("pto:d:"))
async def pick_to_district(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    _, _, ridx, didx = callback.data.split(":")
    region = REGION_NAMES[int(ridx)]
    await state.update_data(to_district=REGIONS[region][int(didx)])
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_type", lang), reply_markup=_types_kb(lang))
    await state.set_state(ParcelOrder.choosing_type)


# ── What ─────────────────────────────────────────────────────────────────────────────────────


@router.callback_query(ParcelOrder.choosing_type, F.data.startswith("parcel:type:"))
async def pick_type(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    code = callback.data.split(":")[-1]
    if code not in PARCEL_TYPES:
        await callback.answer()
        return
    await state.update_data(cargo_type=code)
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_weight", lang), reply_markup=_weights_kb())
    await state.set_state(ParcelOrder.choosing_weight)


@router.callback_query(ParcelOrder.choosing_weight, F.data.startswith("parcel:w:"))
async def pick_weight(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    if not 0 <= idx < len(WEIGHTS):
        await callback.answer()
        return
    await state.update_data(weight=WEIGHTS[idx])
    await callback.answer()
    await callback.message.edit_text(t("parcel_ask_recipient_name", lang))
    await state.set_state(ParcelOrder.entering_recipient_name)


# ── Recipient ────────────────────────────────────────────────────────────────────────────────


@router.message(ParcelOrder.entering_recipient_name, F.text)
async def enter_recipient_name(message: Message, state: FSMContext, lang: str) -> None:
    name = message.text.strip()
    if not 2 <= len(name) <= 80:
        await message.answer(t("parcel_invalid_name", lang))
        return
    await state.update_data(recipient_name=name)
    await message.answer(t("parcel_ask_recipient_phone", lang))
    await state.set_state(ParcelOrder.entering_recipient_phone)


@router.message(ParcelOrder.entering_recipient_phone, F.text)
async def enter_recipient_phone(message: Message, state: FSMContext, lang: str) -> None:
    phone = normalize_phone(message.text)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return
    await state.update_data(recipient_phone=phone)
    await message.answer(t("parcel_ask_note", lang), reply_markup=_skip_kb(lang))
    await state.set_state(ParcelOrder.entering_note)


@router.message(ParcelOrder.entering_note, F.text)
async def enter_note(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(note=message.text.strip()[:500])
    await _ask_price(message, state, lang)


@router.callback_query(ParcelOrder.entering_note, F.data == "parcel:note:skip")
async def skip_note(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await state.update_data(note=None)
    await callback.answer()
    await callback.message.edit_reply_markup()
    await _ask_price(callback.message, state, lang)


# ── Price ────────────────────────────────────────────────────────────────────────────────────


async def _ask_price(message: Message, state: FSMContext, lang: str) -> None:
    data = await state.get_data()
    suggested = suggested_price(data["weight"], data["from_region"] == data["to_region"])
    await message.answer(t("parcel_ask_price", lang, price=_som(suggested)), reply_markup=_price_kb(lang, suggested))
    await state.set_state(ParcelOrder.choosing_price)


@router.callback_query(ParcelOrder.choosing_price, F.data == "parcel:price:other")
async def price_other(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_reply_markup()
    await callback.message.answer(t("parcel_ask_price_text", lang))
    await state.set_state(ParcelOrder.entering_price)


@router.callback_query(ParcelOrder.choosing_price, F.data.startswith("parcel:price:"))
async def pick_price(callback: CallbackQuery, state: FSMContext, bot_user, lang: str) -> None:
    try:
        price = int(callback.data.split(":")[-1])
    except ValueError:
        price = 0
    if not MIN_PRICE <= price <= MAX_PRICE:
        await callback.answer()
        return
    await state.update_data(price=price)
    await callback.answer()
    await callback.message.edit_reply_markup()
    await _show_summary(callback.message, state, bot_user, lang)


@router.message(ParcelOrder.entering_price, F.text)
async def enter_price(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    digits = "".join(ch for ch in message.text if ch.isdigit())
    price = int(digits) if digits else 0
    if not MIN_PRICE <= price <= MAX_PRICE:
        await message.answer(t("parcel_invalid_price", lang))
        return
    await state.update_data(price=price)
    await _show_summary(message, state, bot_user, lang)


# ── Confirm ──────────────────────────────────────────────────────────────────────────────────


async def _show_summary(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    data = await state.get_data()
    e = html.escape
    note = data.get("note")
    text = t(
        "parcel_summary",
        lang,
        from_label=e(_place(data["from_region"], data["from_district"])),
        to_label=e(_place(data["to_region"], data["to_district"])),
        type_label=t(f"parcel_type_{data['cargo_type']}", lang),
        weight=data["weight"],
        sender_name=e(bot_user.name or message.chat.full_name or "—"),
        sender_phone=format_phone(bot_user.phone or ""),
        recipient_name=e(data["recipient_name"]),
        recipient_phone=format_phone(data["recipient_phone"]),
        note_line=f"📝 {e(note)}\n" if note else "",
        price=_som(data["price"]),
    )
    await message.answer(text, reply_markup=_confirm_kb(lang), parse_mode="HTML")
    await state.set_state(ParcelOrder.confirming)


@router.callback_query(ParcelOrder.confirming, F.data == "parcel:cancel")
async def cancel_parcel(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_reply_markup()
    await state.clear()
    await callback.message.answer(t("parcel_cancelled", lang))
    await send_main_menu(callback.message, session, bot_user, lang)


@router.callback_query(ParcelOrder.confirming, F.data == "parcel:send")
async def send_parcel(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    # Buttons go first so a double tap can't post the same parcel twice.
    await callback.message.edit_reply_markup()
    data = await state.get_data()
    await state.clear()

    # The server finds the sender by Telegram id — make sure this account is linked to its site
    # user (by phone) before posting; linking an already linked account changes nothing.
    try:
        await backend_client.link_user(bot_user.phone, bot_user.telegram_id, lang, bot_user.name, username=callback.from_user.username)
    except Exception:
        pass

    payload = {
        "fromLabel": _place(data["from_region"], data["from_district"]),
        "toLabel": _place(data["to_region"], data["to_district"]),
        "fromRegion": data["from_region"],
        "toRegion": data["to_region"],
        "cargoType": data["cargo_type"],
        "vehicleType": "car",
        "weightLabel": data["weight"],
        "recipientName": data["recipient_name"],
        "recipientPhone": data["recipient_phone"],
        "price": data["price"],
    }
    if data.get("note"):
        payload["note"] = data["note"]

    status, body = await backend_client.cargo_create(bot_user.telegram_id, payload)
    if status in (200, 201):
        route = f"{groups_service.short_region(data['from_region'])} → {groups_service.short_region(data['to_region'])}"
        await callback.message.answer(t("parcel_sent", lang, route=route))
    else:
        reason = ((body or {}).get("error") or {}).get("message") if isinstance(body, dict) else None
        await callback.message.answer(t("parcel_failed", lang, reason=reason or t("parcel_failed_generic", lang)))
    await send_main_menu(callback.message, session, bot_user, lang)
