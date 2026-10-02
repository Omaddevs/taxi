from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n.translations import LANG_LABELS, LANGS, t
from app.keyboards.common import menu_text, share_phone_kb
from app.services import users as users_service
from app.services.backend_client import backend_client
from app.services.phone import normalize_phone
from app.states.settings import SettingsFlow

router = Router(name="settings")


def settings_menu_kb(lang: str):
    builder = InlineKeyboardBuilder()
    builder.button(text=t("settings_change_name", lang), callback_data="settings:name")
    builder.button(text=t("settings_change_phone", lang), callback_data="settings:phone")
    builder.button(text=t("settings_change_address", lang), callback_data="settings:address")
    builder.button(text=t("settings_change_language", lang), callback_data="settings:language")
    builder.button(text=t("settings_logout", lang), callback_data="settings:logout")
    builder.adjust(1)
    return builder.as_markup()


def profile_edit_kb(lang: str):
    """Same field-edit buttons as the settings menu, minus language/logout — shown directly
    under the Profil view so editing doesn't require a detour through Sozlamalar."""
    builder = InlineKeyboardBuilder()
    builder.button(text=t("settings_change_name", lang), callback_data="settings:name")
    builder.button(text=t("settings_change_phone", lang), callback_data="settings:phone")
    builder.button(text=t("settings_change_address", lang), callback_data="settings:address")
    builder.adjust(1)
    return builder.as_markup()


def _language_choice_kb():
    builder = InlineKeyboardBuilder()
    for lang in LANGS:
        builder.button(text=LANG_LABELS[lang], callback_data=f"settings:setlang:{lang}")
    builder.adjust(1)
    return builder.as_markup()


@router.message(menu_text("menu_settings"))
async def open_settings(message: Message, bot_user, lang: str) -> None:
    if bot_user is None:
        return
    await message.answer(t("settings_menu", lang), reply_markup=settings_menu_kb(lang))


@router.callback_query(F.data == "settings:name")
async def ask_new_name(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("ask_new_name", lang))
    await state.set_state(SettingsFlow.entering_name)


@router.message(SettingsFlow.entering_name, F.text)
async def set_name(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    name = message.text.strip()
    await users_service.update_name(session, bot_user, name)
    username = message.from_user.username if message.from_user else None
    await backend_client.link_user(bot_user.phone, bot_user.telegram_id, lang, name, username=username)
    await state.clear()
    await message.answer(t("saved_ok", lang))


@router.callback_query(F.data == "settings:phone")
async def ask_new_phone(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("ask_new_phone", lang), reply_markup=share_phone_kb(lang))
    await state.set_state(SettingsFlow.entering_phone)


@router.message(SettingsFlow.entering_phone, F.contact)
async def new_phone_contact(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await _set_phone(message, state, session, bot_user, lang, message.contact.phone_number)


@router.message(SettingsFlow.entering_phone, F.text)
async def new_phone_text(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await _set_phone(message, state, session, bot_user, lang, message.text)


async def _set_phone(message: Message, state: FSMContext, session, bot_user, lang: str, raw_phone: str) -> None:
    phone = normalize_phone(raw_phone)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return

    username = message.from_user.username if message.from_user else None
    await backend_client.link_user(phone, bot_user.telegram_id, lang, bot_user.name, username=username)
    await users_service.update_phone(session, bot_user, phone)
    await state.clear()
    await message.answer(t("saved_ok", lang), reply_markup=ReplyKeyboardRemove())


@router.callback_query(F.data == "settings:address")
async def ask_new_address(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("ask_new_address", lang))
    await state.set_state(SettingsFlow.entering_address)


@router.message(SettingsFlow.entering_address, F.text)
async def set_address(message: Message, state: FSMContext, session, bot_user, lang: str) -> None:
    await users_service.update_address(session, bot_user, message.text.strip())
    await state.clear()
    await message.answer(t("saved_ok", lang))


@router.callback_query(F.data == "settings:language")
async def ask_new_language(callback: CallbackQuery, lang: str) -> None:
    await callback.answer()
    await callback.message.answer(t("choose_language", lang), reply_markup=_language_choice_kb())


@router.callback_query(F.data.startswith("settings:setlang:"))
async def set_language(callback: CallbackQuery, session, bot_user) -> None:
    new_lang = callback.data.split(":")[-1]
    await users_service.update_language(session, bot_user, new_lang)
    await callback.answer()
    await callback.message.answer(t("saved_ok", new_lang))


@router.callback_query(F.data == "settings:logout")
async def logout(callback: CallbackQuery, session, bot_user, lang: str) -> None:
    await users_service.log_out(session, bot_user)
    await callback.answer()
    await callback.message.answer(t("logged_out", lang), reply_markup=ReplyKeyboardRemove())
