""""🛵 Skuter ijara" in the bot: the same listings and rental points as the website's market
(admin panel → Skuter ijara / Xarita joylari), one card at a time, nearest first.

Everything lives on server/ — each card is fetched with backend_client.rent_browse, so a
listing approved or a point added in the admin panel shows up here immediately.

Callback data carries the whole position, so ◀️ / ▶️ work without any stored state:
    rent:<l|p>:<index>:<lat,lng | ->      show card `index` of listings (l) / points (p)
    rentc:<l|p>:<index>:<lat,lng | ->     send that card's contact
"""

import base64
import html
from pathlib import Path

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    FSInputFile,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import settings
from app.handlers.start import send_main_menu
from app.i18n.translations import t
from app.keyboards.common import menu_text
from app.services.backend_client import backend_client
from app.states.rent import RentBrowse

router = Router(name="rent")

PLACEHOLDER = Path(__file__).resolve().parent.parent / "data" / "rent_placeholder.jpg"
KIND = {"l": "listing", "p": "point"}


# ---------------------------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------------------------


def _loc_token(lat: float | None, lng: float | None) -> str:
    return f"{lat:.5f},{lng:.5f}" if lat is not None and lng is not None else "-"


def _parse_loc(token: str) -> tuple[float | None, float | None]:
    if token == "-" or "," not in token:
        return None, None
    try:
        lat, lng = token.split(",", 1)
        return float(lat), float(lng)
    except ValueError:
        return None, None


def _km(distance: float | None) -> str:
    if distance is None:
        return ""
    return f"{round(distance * 1000)} m" if distance < 1 else f"{distance:.1f} km"


def _caption(page: dict) -> str:
    item = page["item"]
    e = lambda v: html.escape(str(v))  # noqa: E731
    top = " · ⭐ TOP" if item.get("featured") else ""
    lines = [f"🛵 <b>{e(item['title'])}</b>", f"🏷 {e(item['badge'])}{top}"]
    if item.get("owner"):
        lines.append(f"👤 {e(item['owner'])}")
    if item.get("price"):
        lines.append(f"💵 <b>{e(item['price'])}</b>")
    if item.get("deposit"):
        lines.append(f"🔒 Zalog: {e(item['deposit'])}")
    if item.get("specs"):
        lines.append(f"⚙️ {e(item['specs'])}")
    if item.get("hours"):
        lines.append(f"🕒 {e(item['hours'])}")
    where = item.get("address") or ""
    distance = _km(item.get("distanceKm"))
    if where or distance:
        lines.append(f"📍 {e(where)}{' — ' if where and distance else ''}{f'<b>{distance}</b> uzoqlikda' if distance else ''}")
    if item.get("description"):
        desc = item["description"]
        lines += ["", f"📝 {e(desc[:220])}{'…' if len(desc) > 220 else ''}"]
    lines += ["", f"<i>{page['index'] + 1} / {page['total']}</i>"]
    return "\n".join(lines)[:1024]


def _card_kb(page: dict, k: str, loc: str, lang: str) -> InlineKeyboardMarkup:
    item = page["item"]
    i, total = page["index"], page["total"]
    builder = InlineKeyboardBuilder()
    sizes = []
    if item.get("lat") is not None and item.get("lng") is not None:
        lat, lng = item["lat"], item["lng"]
        builder.button(text="🗺 Yandex Map", url=f"https://yandex.uz/maps/?pt={lng},{lat}&z=17&l=map")
        builder.button(text="🌍 Google Map", url=f"https://www.google.com/maps/search/?api=1&query={lat},{lng}")
        sizes.append(2)
    builder.button(text="📞 Aloqa", callback_data=f"rentc:{k}:{i}:{loc}")
    if settings.webapp_url.startswith("https://") and k == "l":
        builder.button(text="🌐 Saytda", url=f"{settings.webapp_url.rstrip('/')}/?ijara=1&elon={item['id']}")
        sizes.append(2)
    else:
        sizes.append(1)
    if total > 1:
        builder.button(text="◀️ Oldingi", callback_data=f"rent:{k}:{i - 1}:{loc}")
        builder.button(text=f"{i + 1}/{total}", callback_data="rent:noop")
        builder.button(text="Keyingi ▶️", callback_data=f"rent:{k}:{i + 1}:{loc}")
        sizes.append(3)
    other = "p" if k == "l" else "l"
    builder.button(text=t("rent_points" if k == "l" else "rent_listings", lang), callback_data=f"rent:{other}:0:{loc}")
    sizes.append(1)
    builder.adjust(*sizes)
    return builder.as_markup()


def _photo_input(item: dict):
    """The card's photo: a data: URI from the admin/website uploader, a plain URL, or our
    placeholder when the listing has none."""
    photo = item.get("photo")
    if isinstance(photo, str) and photo.startswith("data:image/") and "," in photo:
        header, data = photo.split(",", 1)
        ext = header.split("/")[1].split(";")[0] or "jpg"
        try:
            return BufferedInputFile(base64.b64decode(data), filename=f"rent.{ext}")
        except ValueError:
            pass
    if isinstance(photo, str) and photo.startswith("https://"):
        return photo
    return FSInputFile(PLACEHOLDER)


def _reply_kb(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t("rent_send_location", lang), request_location=True)],
            [KeyboardButton(text=t("rent_listings", lang)), KeyboardButton(text=t("rent_points", lang))],
            [KeyboardButton(text=t("back", lang))],
        ],
        resize_keyboard=True,
    )


async def _fetch(k: str, index: int, loc: str) -> dict | None:
    lat, lng = _parse_loc(loc)
    return await backend_client.rent_browse(KIND[k], index, lat, lng)


async def _send_card(message: Message, k: str, index: int, loc: str, lang: str) -> None:
    page = await _fetch(k, index, loc)
    if page is None:
        await message.answer("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.")
        return
    if not page.get("item"):
        # Nothing of this kind — try the other kind before giving up.
        other = "p" if k == "l" else "l"
        alt = await _fetch(other, 0, loc)
        if alt and alt.get("item"):
            page, k = alt, other
        else:
            await message.answer(t("rent_empty", lang))
            return
    caption, kb = _caption(page), _card_kb(page, k, loc, lang)
    try:
        await message.answer_photo(_photo_input(page["item"]), caption=caption, reply_markup=kb, parse_mode="HTML")
    except TelegramBadRequest:
        # Telegram refused the listing's own image (format/size) — the card still matters more.
        await message.answer_photo(FSInputFile(PLACEHOLDER), caption=caption, reply_markup=kb, parse_mode="HTML")


# ---------------------------------------------------------------------------------------------
# Entry and reply-keyboard buttons
# ---------------------------------------------------------------------------------------------


@router.message(menu_text("menu_rent"))
async def open_rent(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    if bot_user is None:
        return
    await state.set_state(RentBrowse.browsing)
    await message.answer(t("rent_intro", lang), reply_markup=_reply_kb(lang), parse_mode="HTML")


@router.message(RentBrowse.browsing, F.location)
async def got_location(message: Message, state: FSMContext, lang: str) -> None:
    loc = _loc_token(message.location.latitude, message.location.longitude)
    await state.update_data(rent_loc=loc)
    await message.answer(t("rent_location_ok", lang))
    await _send_card(message, "l", 0, loc, lang)


@router.message(RentBrowse.browsing, menu_text("rent_listings"))
async def show_listings(message: Message, state: FSMContext, lang: str) -> None:
    loc = (await state.get_data()).get("rent_loc", "-")
    await _send_card(message, "l", 0, loc, lang)


@router.message(RentBrowse.browsing, menu_text("rent_points"))
async def show_points(message: Message, state: FSMContext, lang: str) -> None:
    loc = (await state.get_data()).get("rent_loc", "-")
    await _send_card(message, "p", 0, loc, lang)


@router.message(RentBrowse.browsing, menu_text("back"))
async def leave(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await state.clear()
    await send_main_menu(message, session, bot_user, lang)


# ---------------------------------------------------------------------------------------------
# Card buttons
# ---------------------------------------------------------------------------------------------


@router.callback_query(F.data == "rent:noop")
async def noop(callback: CallbackQuery) -> None:
    await callback.answer()


@router.callback_query(F.data.startswith("rent:"))
async def navigate(callback: CallbackQuery, lang: str) -> None:
    try:
        _, k, index, loc = callback.data.split(":", 3)
        index = int(index)
    except ValueError:
        await callback.answer()
        return
    if k not in KIND:
        await callback.answer()
        return

    page = await _fetch(k, index, loc)
    if page is None:
        await callback.answer("Xatolik yuz berdi. Qayta urinib ko'ring.", show_alert=True)
        return
    if not page.get("item"):
        await callback.answer(t("rent_empty", lang), show_alert=True)
        return

    caption, kb = _caption(page), _card_kb(page, k, loc, lang)
    for media in (_photo_input(page["item"]), FSInputFile(PLACEHOLDER)):
        try:
            await callback.message.edit_media(InputMediaPhoto(media=media, caption=caption, parse_mode="HTML"), reply_markup=kb)
            break
        except TelegramBadRequest as err:
            if "message is not modified" in str(err):
                break
            continue
        except TelegramAPIError:
            break
    await callback.answer()


@router.callback_query(F.data.startswith("rentc:"))
async def contact(callback: CallbackQuery, lang: str) -> None:
    try:
        _, k, index, loc = callback.data.split(":", 3)
        page = await _fetch(k, int(index), loc)
    except (ValueError, KeyError):
        await callback.answer()
        return
    item = (page or {}).get("item")
    if not item or not (item.get("phone") or item.get("telegram")):
        await callback.answer(t("rent_no_contact", lang), show_alert=True)
        return

    chat_id = callback.message.chat.id
    name = (item.get("owner") or item.get("title") or "TaxiLine")[:60]
    if item.get("phone"):
        try:
            # A Telegram contact card: one tap to call or save the number.
            await callback.bot.send_contact(chat_id, phone_number=item["phone"], first_name=name)
        except TelegramAPIError:
            await callback.message.answer(f"📞 {item['phone']}")
    if item.get("telegram"):
        builder = InlineKeyboardBuilder()
        builder.button(text="✈️ Telegramda yozish", url=f"https://t.me/{item['telegram']}")
        await callback.message.answer(f"💬 @{html.escape(item['telegram'])}", reply_markup=builder.as_markup())
    await callback.answer()
