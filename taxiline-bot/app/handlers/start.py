from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n.translations import t
from app.keyboards.common import driver_menu_kb, language_kb, main_menu_kb, share_phone_kb
from app.services import drivers as drivers_service
from app.services import users as users_service
from app.services.backend_client import backend_client
from app.services.phone import normalize_phone
from app.states.registration import Registration
from app.handlers import giveaway

router = Router(name="start")


async def _build_menu(session, bot_user, lang: str):
    """An approved driver gets the driver-oriented reply keyboard (no passenger buttons, to
    avoid confusion) — everyone else, including a driver whose application is still pending or
    was rejected, gets the normal client menu."""
    driver = await drivers_service.get_by_bot_user(session, bot_user.id)
    if driver is not None:
        # Keep the webapp User.role in lockstep with the bot: whoever registered as a driver
        # here must land in the driver shell after OTP / WebApp login.
        await backend_client.sync_driver(
            phone=driver.phone or bot_user.phone,
            telegram_id=bot_user.telegram_id,
            name=driver.full_name or bot_user.name,
            car_model=driver.car_model,
            plate=driver.plate,
            approved=driver.status == "APPROVED",
            status=driver.status,
        )

    code = await backend_client.telegram_login_token(bot_user.telegram_id)
    if driver is not None and driver.status == "APPROVED":
        return t("driver_main_menu_hint", lang), driver_menu_kb(lang, code, bot_user.is_admin)

    return t("main_menu_hint", lang), main_menu_kb(lang, code, bot_user.is_admin)


async def send_menu_to(bot, chat_id: int, session, bot_user, lang: str) -> None:
    """Like send_main_menu, but not tied to an incoming Message — used when the menu needs to
    go to someone other than whoever triggered the current handler (e.g. an admin approving a
    driver from their own chat needs to push the new menu into the *driver's* chat)."""
    text, kb = await _build_menu(session, bot_user, lang)
    await bot.send_message(chat_id, text, reply_markup=kb)


async def send_main_menu(message: Message, session, bot_user, lang: str) -> None:
    text, kb = await _build_menu(session, bot_user, lang)
    await message.answer(text, reply_markup=kb)


def _login_or_register_kb(lang: str):
    # Both buttons lead to the same phone-entry step: whatever number the user enters is
    # looked up against the webapp's users, so "Kirish" and "Ro'yxatdan o'tish" naturally
    # resolve to login-if-found / register-if-not without needing separate flows.
    builder = InlineKeyboardBuilder()
    builder.button(text=t("login_or_register", lang), callback_data="postlogout:enter_phone")
    builder.button(text=t("register_btn", lang), callback_data="postlogout:enter_phone")
    builder.adjust(2)
    return builder.as_markup()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    # Deep link from the webapp's "Kod olish" button (`t.me/<bot>?start=otp_<id>`): the payload
    # alone proves the tap, so the code is confirmed immediately and we skip straight past the
    # normal language/phone/name flow below. A plain /start (no payload) or the bot opened as a
    # WebApp never reaches this branch, so the normal flow is untouched for every other case.
    parts = (message.text or "").split(maxsplit=1)
    payload = parts[1].strip() if len(parts) > 1 else ""
    if payload.startswith("otp_"):
        await _handle_otp_deep_link(message, payload[len("otp_") :], lang)
        return
    # Landing page "Random mijoz" form: `t.me/<bot>?start=gw_<token>` links the entry to this account.
    if payload.startswith("gw_"):
        await giveaway.handle_deep_link(message, payload[len("gw_") :], lang)
        return

    await state.clear()

    if bot_user is not None and not bot_user.logged_out:
        await users_service.touch_last_seen(session, bot_user)
        name = bot_user.name or message.from_user.first_name or ""
        await message.answer(t("welcome_back", bot_user.language, name=name), reply_markup=ReplyKeyboardRemove())
        await send_main_menu(message, session, bot_user, bot_user.language)
        return

    await message.answer(t("choose_language", "uz"), reply_markup=language_kb())
    await state.set_state(Registration.choosing_language)
    if bot_user is not None and bot_user.logged_out:
        await state.update_data(relogin=True)


@router.callback_query(Registration.choosing_language, F.data.startswith("lang:"))
async def choose_language(callback: CallbackQuery, state: FSMContext) -> None:
    lang = callback.data.split(":", 1)[1]
    data = await state.get_data()
    await state.update_data(language=lang)
    await callback.answer()
    await callback.message.edit_text(t("welcome", lang, name=callback.from_user.first_name or ""))

    if data.get("relogin"):
        await callback.message.answer(t("post_logout_prompt", lang), reply_markup=_login_or_register_kb(lang))
        return

    await callback.message.answer(t("ask_phone", lang), reply_markup=share_phone_kb(lang))
    await state.set_state(Registration.entering_phone)


@router.callback_query(F.data == "postlogout:enter_phone")
async def postlogout_enter_phone(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    lang = data.get("language", "uz")
    await callback.answer()
    await callback.message.answer(t("ask_login_phone", lang), reply_markup=share_phone_kb(lang))
    await state.set_state(Registration.entering_phone)


@router.message(Registration.entering_phone, F.contact)
async def phone_via_contact(message: Message, state: FSMContext, session) -> None:
    await _handle_phone(message, state, session, message.contact.phone_number)


@router.message(Registration.entering_phone, F.text)
async def phone_via_text(message: Message, state: FSMContext, session) -> None:
    await _handle_phone(message, state, session, message.text)


async def _handle_otp_deep_link(message: Message, otp_request_id: str, lang: str) -> None:
    # Sign-in codes moved to @taxiline_kirish_bot; this bot no longer confirms or sends them.
    # Old links (cached pages, bookmarks) land here — point them over.
    builder = InlineKeyboardBuilder()
    builder.button(text="🔐 @taxiline_kirish_bot", url="https://t.me/taxiline_kirish_bot?start=kirish")
    await message.answer(
        "🔐 Saytga kirish kodi endi @taxiline_kirish_bot orqali beriladi. Tugmani bosib, kodni oling.",
        reply_markup=builder.as_markup(),
    )


async def _handle_phone(message: Message, state: FSMContext, session, raw_phone: str) -> None:
    data = await state.get_data()
    lang = data.get("language", "uz")
    phone = normalize_phone(raw_phone)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return

    tg = message.from_user
    core_user = await backend_client.resolve_user(phone)

    if core_user:
        linked = await backend_client.link_user(
            phone, tg.id, lang, core_user.get("name"), username=tg.username
        )
        bot_user = await users_service.upsert_from_telegram(
            session,
            telegram_id=tg.id,
            phone=phone,
            name=linked.get("name") or tg.full_name,
            username=tg.username,
            language=lang,
            core_user_id=linked["id"],
        )
        await state.clear()
        await message.answer(t("registered_ok", lang), reply_markup=ReplyKeyboardRemove())
        await send_main_menu(message, session, bot_user, lang)
        return

    await state.update_data(phone=phone)
    await message.answer(t("not_registered", lang), reply_markup=ReplyKeyboardRemove())
    await state.set_state(Registration.entering_name)


@router.message(Registration.entering_name, F.text)
async def enter_name(message: Message, state: FSMContext, session) -> None:
    data = await state.get_data()
    lang = data.get("language", "uz")
    phone = data["phone"]
    name = message.text.strip()
    tg = message.from_user

    linked = await backend_client.link_user(phone, tg.id, lang, name, username=tg.username)
    bot_user = await users_service.upsert_from_telegram(
        session,
        telegram_id=tg.id,
        phone=phone,
        name=name,
        username=tg.username,
        language=lang,
        core_user_id=linked["id"],
    )
    await state.clear()
    await message.answer(t("registered_ok", lang))
    await send_main_menu(message, session, bot_user, lang)


@router.callback_query(F.data == "mandatory_sub:check")
async def recheck_mandatory_sub(callback: CallbackQuery, session, bot_user, lang: str) -> None:
    from app.middlewares.mandatory_sub import _missing_targets

    if bot_user is None:
        await callback.answer()
        return

    missing = await _missing_targets(callback.bot, session, callback.from_user.id)
    if missing:
        await callback.answer(t("mandatory_sub_missing", lang), show_alert=True)
        return

    await callback.answer(t("mandatory_sub_ok", lang), show_alert=True)
    await callback.message.delete()
