"""@taxiline_kirish_bot handlers.

/start, /kirish → a sign-in code · /royxatdan_otish → a registration code · /profil ·
/sozlamalar (the "fill the code in on the website by itself" switch) · /help (admin contact).

People are recognised by their Telegram id; the first time, the bot asks for their number
through Telegram's own contact button and accepts it only if the contact is their own
(contact.user_id == from_user.id) — that is what lets the server link the account.
"""

import html
import logging
from datetime import datetime, timezone

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    CopyTextButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    User,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import settings
from app.services import bot_config
from app.services.backend_client import backend_client
from app.services.phone import format_phone

logger = logging.getLogger(__name__)
router = Router(name="kirish")
router.message.filter(F.chat.type == "private")

LOGIN_BTN = "🔑 Kirish kodi"
REGISTER_BTN = "📝 Ro'yxatdan o'tish"
PROFILE_BTN = "👤 Profil"
SETTINGS_BTN = "⚙️ Sozlamalar"
HELP_BTN = "🆘 Yordam"
CANCEL_BTN = "⬅️ Bekor qilish"

ROLE_LABELS = {"DRIVER": "Haydovchi", "PASSENGER": "Yo'lovchi"}


class KirishFlow(StatesGroup):
    # Waiting for the contact; `after` in the state data says what to do with it.
    sharing_contact = State()


def main_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=LOGIN_BTN), KeyboardButton(text=REGISTER_BTN)],
            [KeyboardButton(text=PROFILE_BTN), KeyboardButton(text=SETTINGS_BTN)],
            [KeyboardButton(text=HELP_BTN)],
        ],
        resize_keyboard=True,
        is_persistent=True,
    )


def contact_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Raqamimni yuborish", request_contact=True)], [KeyboardButton(text=CANCEL_BTN)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def _site(path: str) -> str | None:
    base = settings.webapp_url.rstrip("/")
    return f"{base}{path}" if base.startswith("https://") else None


def _identity(user: User, phone: str | None = None) -> dict:
    payload = {"telegramId": str(user.id), "name": user.full_name}
    if user.username:
        payload["telegramUsername"] = user.username
    if user.language_code in ("uz", "ru", "en"):
        payload["language"] = user.language_code
    if phone:
        payload["phone"] = phone
    return payload


# ── the code message (also used by server pushes, see webserver /webapp/kirish/push-code) ──


def _minutes_left(expires_at: str | None) -> int:
    if not expires_at:
        return 5
    try:
        expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except ValueError:
        return 5
    seconds = (expires - datetime.now(timezone.utc)).total_seconds()
    return max(1, round(seconds / 60))


def code_text(code: str, phone: str, intent: str, expires_at: str | None, *, already_registered: bool = False) -> str:
    title = "📝 <b>Ro'yxatdan o'tish kodi</b>" if intent == "register" else "🔐 <b>Kirish kodi</b>"
    page = "ro'yxatdan o'tish" if intent == "register" else "kirish"
    lines = [title, ""]
    if already_registered:
        lines += ["ℹ️ Siz allaqachon ro'yxatdan o'tgansiz — bu kirish uchun kod.", ""]
    lines += [
        f"<code>{html.escape(code)}</code>",
        "",
        f"⏳ {_minutes_left(expires_at)} daqiqa amal qiladi",
        f"📱 {html.escape(format_phone(phone))}",
        "",
        f"Kodni taxiline.uz saytidagi {page} sahifasiga kiriting. Kod ustiga bossangiz, nusxalanadi.",
        "🔒 Kodni hech kimga bermang — TaxiLine xodimlari uni hech qachon so'ramaydi.",
    ]
    return "\n".join(lines)


def code_kb(code: str, intent: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="📋 Nusxalash", copy_text=CopyTextButton(text=code))
    builder.button(text="🔄 Yangi kod", callback_data=f"kir:new:{intent}")
    site = _site("/register" if intent == "register" else "/login")
    if site:
        builder.button(text="🌐 Saytga o'tish", url=site)
    builder.adjust(2, 1)
    return builder.as_markup()


async def push_code(bot: Bot, telegram_id: int, code: str, phone: str, intent: str, expires_at: str | None = None) -> bool:
    """A code the website requested for a linked account — sent if they've ever opened this bot."""
    try:
        await bot.send_message(telegram_id, code_text(code, phone, intent, expires_at), parse_mode="HTML", reply_markup=code_kb(code, intent))
        return True
    except Exception:  # never started the bot / blocked it — they can still ask with /kirish
        return False


# ── flows ──────────────────────────────────────────────────────────────────────────────────


async def _ask_contact(message: Message, state: FSMContext, after: str) -> None:
    await state.set_state(KirishFlow.sharing_contact)
    await state.update_data(after=after)
    await message.answer(
        "📱 Avval telefon raqamingizni tasdiqlaymiz.\n\n"
        "Pastdagi <b>«📱 Raqamimni yuborish»</b> tugmasini bosing — Telegram raqamingizni o'zi yuboradi. "
        "Bu bir martalik: keyingi safar kod darhol chiqadi.",
        parse_mode="HTML",
        reply_markup=contact_kb(),
    )


async def _send_code(message: Message, state: FSMContext, user: User, intent: str, *, phone: str | None = None, fresh: bool = False) -> None:
    result = await backend_client.kirish_code({**_identity(user, phone), "intent": intent, "fresh": fresh})
    if result is None:
        await message.answer("⚠️ Xizmat vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring.", reply_markup=main_kb())
        return
    status = result.get("status")
    if status == "need_phone":
        await _ask_contact(message, state, intent)
        return
    await state.clear()
    if status == "not_registered":
        builder = InlineKeyboardBuilder()
        builder.button(text="📝 Ro'yxatdan o'tish kodi", callback_data="kir:code:register")
        await message.answer(
            f"🙁 <b>{html.escape(format_phone(result.get('phone', '')))}</b> raqami hali TaxiLine'da ro'yxatdan o'tmagan.\n\n"
            "Ro'yxatdan o'tish kodini oling va saytdagi ro'yxatdan o'tish sahifasiga kiriting.",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
        await message.answer("Menyu 👇", reply_markup=main_kb())
        return
    if status != "ok":
        await message.answer("⚠️ Kod olib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.", reply_markup=main_kb())
        return
    await message.answer(
        code_text(result["code"], result["phone"], result["intent"], result.get("expiresAt"), already_registered=bool(result.get("alreadyRegistered"))),
        parse_mode="HTML",
        reply_markup=code_kb(result["code"], result["intent"]),
    )


def _autofill_kb(enabled: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text="⬜️ Avto-yozishni o'chirish" if enabled else "✅ Avto-yozishni yoqish",
        callback_data=f"kir:af:{0 if enabled else 1}",
    )
    return builder.as_markup()


def _settings_text(enabled: bool) -> str:
    state_text = "✅ <b>Yoqilgan</b>" if enabled else "⬜️ <b>O'chiq</b>"
    return (
        "⚙️ <b>Sozlamalar</b>\n\n"
        f"✍️ Kodni saytga avtomatik yozish: {state_text}\n\n"
        "Yoqilsa, saytdagi kirish sahifasida kod o'zi paydo bo'ladi — faqat «Tasdiqlash»ni bosasiz. "
        "O'chiq bo'lsa, kodni shu botdan olib, o'zingiz kiritasiz (xavfsizroq)."
    )


def _profile_text(profile: dict) -> str:
    lines = [
        "👤 <b>Profil</b>",
        "",
        f"Ism: <b>{html.escape(profile.get('name') or '—')}</b>",
        f"Telefon: <b>{html.escape(format_phone(profile.get('phone') or ''))}</b>",
        f"Turi: {ROLE_LABELS.get(profile.get('role'), profile.get('role') or '—')}",
        f"Kodni saytga avto-yozish: {'✅ yoqilgan' if profile.get('otpAutofill') else '⬜️ o‘chiq'}",
    ]
    if not profile.get("telegramLinked"):
        lines += ["", "⚠️ Bu raqam boshqa Telegram akkauntga bog'langan — sozlamalarni faqat o'sha akkaunt o'zgartira oladi."]
    return "\n".join(lines)


async def _show_profile(message: Message, state: FSMContext, user: User, *, settings_view: bool, phone: str | None = None) -> None:
    profile = await backend_client.kirish_profile(_identity(user, phone))
    if profile is None:
        await message.answer("⚠️ Xizmat vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring.", reply_markup=main_kb())
        return
    if not profile.get("linked"):
        if phone:  # shared a number that has no account yet
            await state.clear()
            builder = InlineKeyboardBuilder()
            builder.button(text="📝 Ro'yxatdan o'tish kodi", callback_data="kir:code:register")
            await message.answer("🙁 Bu raqam hali ro'yxatdan o'tmagan.", reply_markup=builder.as_markup())
            await message.answer("Menyu 👇", reply_markup=main_kb())
            return
        await _ask_contact(message, state, "settings" if settings_view else "profile")
        return
    await state.clear()
    enabled = bool(profile.get("otpAutofill"))
    text = _settings_text(enabled) if settings_view else _profile_text(profile)
    markup = _autofill_kb(enabled) if profile.get("telegramLinked") else None
    await message.answer(text, parse_mode="HTML", reply_markup=markup)
    if phone:
        await message.answer("Menyu 👇", reply_markup=main_kb())


# ── commands & buttons ─────────────────────────────────────────────────────────────────────


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, command: CommandObject) -> None:
    await state.clear()
    payload = (command.args or "").strip().lower()
    await message.answer(
        f"👋 Assalomu alaykum, {html.escape(message.from_user.first_name or '')}!\n\n"
        "Bu — <b>TaxiLine kirish boti</b>. Bu yerda taxiline.uz saytiga kirish va ro'yxatdan o'tish uchun "
        "tasdiqlash kodini olasiz.",
        parse_mode="HTML",
        reply_markup=main_kb(),
    )
    await _send_code(message, state, message.from_user, "register" if payload.startswith("royxat") else "login")


@router.message(Command("kirish", "login"))
@router.message(F.text == LOGIN_BTN)
async def login_code(message: Message, state: FSMContext) -> None:
    await _send_code(message, state, message.from_user, "login")


@router.message(Command("royxatdan_otish", "register"))
@router.message(F.text == REGISTER_BTN)
async def register_code(message: Message, state: FSMContext) -> None:
    await _send_code(message, state, message.from_user, "register")


@router.message(Command("profil", "profile"))
@router.message(F.text == PROFILE_BTN)
async def profile(message: Message, state: FSMContext) -> None:
    await _show_profile(message, state, message.from_user, settings_view=False)


@router.message(Command("sozlamalar", "settings"))
@router.message(F.text == SETTINGS_BTN)
async def settings_view(message: Message, state: FSMContext) -> None:
    await _show_profile(message, state, message.from_user, settings_view=True)


@router.message(Command("help", "yordam"))
@router.message(F.text == HELP_BTN)
async def help_view(message: Message) -> None:
    builder = InlineKeyboardBuilder()
    builder.button(text="👨‍💼 Adminga yozish", url=bot_config.get("admin_contact_url"))
    site = _site("/")
    if site:
        builder.button(text="🌐 taxiline.uz", url=site)
    builder.button(text="🚕 Asosiy bot", url="https://t.me/taxilines_bot")
    builder.adjust(1)
    await message.answer(
        "🆘 <b>Yordam</b>\n\n"
        "• <b>/kirish</b> — saytga kirish kodi\n"
        "• <b>/royxatdan_otish</b> — ro'yxatdan o'tish kodi\n"
        "• <b>/profil</b> — ma'lumotlaringiz\n"
        "• <b>/sozlamalar</b> — kodni saytga avtomatik yozishni yoqish/o'chirish\n\n"
        "Kod kelmayaptimi, kirib bo'lmayaptimi yoki boshqa muammo bormi? Adminga yozing — tez orada javob beramiz.",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )


@router.message(KirishFlow.sharing_contact, F.contact)
async def contact_shared(message: Message, state: FSMContext) -> None:
    contact = message.contact
    if contact.user_id != message.from_user.id:
        await message.answer("⚠️ Faqat o'zingizning raqamingizni yuboring — pastdagi tugmani bosing.", reply_markup=contact_kb())
        return
    after = (await state.get_data()).get("after", "login")
    if after in ("profile", "settings"):
        await _show_profile(message, state, message.from_user, settings_view=after == "settings", phone=contact.phone_number)
        return
    await message.answer("✅ Raqam qabul qilindi.", reply_markup=main_kb())
    await _send_code(message, state, message.from_user, after, phone=contact.phone_number)


@router.message(KirishFlow.sharing_contact, F.text == CANCEL_BTN)
async def contact_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("Bekor qilindi.", reply_markup=main_kb())


@router.message(KirishFlow.sharing_contact)
async def contact_expected(message: Message) -> None:
    await message.answer("Raqamingizni pastdagi «📱 Raqamimni yuborish» tugmasi orqali yuboring.", reply_markup=contact_kb())


@router.callback_query(F.data.startswith("kir:new:"))
async def new_code(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer("Yangi kod yuborilmoqda…")
    await _send_code(callback.message, state, callback.from_user, callback.data.split(":")[2], fresh=True)


@router.callback_query(F.data.startswith("kir:code:"))
async def code_from_button(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await _send_code(callback.message, state, callback.from_user, callback.data.split(":")[2])


@router.callback_query(F.data.startswith("kir:af:"))
async def toggle_autofill(callback: CallbackQuery) -> None:
    enabled = callback.data.endswith(":1")
    result = await backend_client.kirish_autofill({**_identity(callback.from_user), "enabled": enabled})
    if not result or not result.get("linked"):
        await callback.answer("Avval /kirish orqali raqamingizni tasdiqlang.", show_alert=True)
        return
    now_enabled = bool(result.get("otpAutofill"))
    await callback.answer("✅ Yoqildi" if now_enabled else "⬜️ O'chirildi")
    try:
        await callback.message.edit_text(_settings_text(now_enabled), parse_mode="HTML", reply_markup=_autofill_kb(now_enabled))
    except Exception:
        pass


@router.message()
async def fallback(message: Message) -> None:
    await message.answer("Kerakli bo'limni pastdagi menyudan tanlang 👇 yoki /help", reply_markup=main_kb())
