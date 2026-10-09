"""Buttons of the public-group passenger/driver routing (see services/group_ads.py):

* gad:p / gad:d — 🙋 Yo'lovchiman / 🚖 Haydovchiman on the question in the open group
* gad:c / gad:r — ✅ Men olaman / ↩️ Bo'shatish on the card in the closed driver group
* /start gad_<id> — «Yuborish»: the passenger resends or changes their ad in the bot's DM
* gad:x — cancel the ad from that DM
"""

import html

from aiogram import F, Router
from aiogram.dispatcher.event.bases import SkipHandler
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import GroupAd
from app.services import group_ads as group_ads_service
from app.services.ad_format import parse_ad_fields
from app.states.group_ads import GroupAdResubmit

router = Router(name="group_ads")

_ROLE_BY_CODE = {"p": group_ads_service.PASSENGER, "d": group_ads_service.DRIVER}


async def _load(session, callback: CallbackQuery) -> GroupAd | None:
    try:
        ad_id = int(callback.data.split(":")[2])
    except (IndexError, ValueError):
        return None
    return await session.get(GroupAd, ad_id)


@router.callback_query(F.data.regexp(r"^gad:[pd]:\d+$"))
async def answer_question(callback: CallbackQuery, session) -> None:
    ad = await _load(session, callback)
    if ad is None:
        await callback.answer("Bu so'rov eskirgan.", show_alert=True)
        return
    if callback.from_user.id != ad.author_telegram_id:
        await callback.answer(f"Bu savol {ad.author_name} uchun. O'z e'loningizni guruhga yozing.", show_alert=True)
        return
    error = await group_ads_service.answer(callback.bot, session, ad, _ROLE_BY_CODE[callback.data.split(":")[1]])
    await callback.answer(error or "✅ Qabul qilindi", show_alert=bool(error))


@router.callback_query(F.data.regexp(r"^gad:c:\d+$"))
async def take_ad(callback: CallbackQuery, session, bot_user) -> None:
    ad = await _load(session, callback)
    if ad is None:
        await callback.answer("E'lon topilmadi.", show_alert=True)
        return
    name = bot_user.name if bot_user and bot_user.name else callback.from_user.full_name
    error = await group_ads_service.take(callback.bot, session, ad, callback.from_user.id, name)
    await callback.answer(error or "✅ E'lon sizga biriktirildi. Yo'lovchi bilan bog'laning.", show_alert=bool(error))


@router.callback_query(F.data.regexp(r"^gad:r:\d+$"))
async def release_ad(callback: CallbackQuery, session) -> None:
    ad = await _load(session, callback)
    if ad is None:
        await callback.answer("E'lon topilmadi.", show_alert=True)
        return
    error = await group_ads_service.release(callback.bot, session, ad, callback.from_user.id)
    await callback.answer(error or "↩️ E'lon yana faol.", show_alert=bool(error))


def _resubmit_kb(ad: GroupAd):
    builder = InlineKeyboardBuilder()
    if ad.status in ("SENT", "TAKEN"):
        builder.button(text="❌ E'lonni bekor qilish", callback_data=f"gad:x:{ad.id}")
    return builder.as_markup()


@router.message(CommandStart(deep_link=True), F.chat.type == "private", F.text.regexp(r"^/start gad_\d+$"))
async def resubmit_start(message: Message, state: FSMContext, session) -> None:
    ad = await session.get(GroupAd, int(message.text.split("gad_", 1)[1]))
    if ad is None or ad.author_telegram_id != message.from_user.id:
        await message.answer("Bu havola sizning e'loningizga tegishli emas. E'loningizni guruhga yozing.")
        return
    ad = await group_ads_service.latest_for_author(session, ad)
    await state.set_state(GroupAdResubmit.entering_text)
    await state.update_data(group_ad_id=ad.id)
    await message.answer(
        "📝 <b>Hozirgi e'loningiz:</b>\n"
        f"<blockquote>{html.escape(ad.text[:1500])}</blockquote>\n\n"
        "Yangi ma'lumotlarni <b>bitta xabarda</b> yuboring: qayerdan → qayerga, jo'nash vaqti, "
        "necha kishi, telefon raqam. Haydovchilar guruhidagi e'loningiz shu bilan almashtiriladi.",
        parse_mode="HTML",
        reply_markup=_resubmit_kb(ad),
    )


@router.message(GroupAdResubmit.entering_text, F.chat.type == "private", F.text | F.photo)
async def resubmit_text(message: Message, state: FSMContext, session) -> None:
    text = (message.text or message.caption or "").strip()
    if not text or text.startswith("/"):
        await message.answer("E'lon matnini yozing (rasm bo'lsa — izoh bilan).")
        return
    parsed = parse_ad_fields(text)
    if not parsed.phones and not (parsed.origins or parsed.destinations) and len(text) < 40:
        # Looks like a menu button or a stray word, not an ad — leave the resubmit flow and
        # let the normal handlers deal with it.
        await state.clear()
        raise SkipHandler
    data = await state.get_data()
    ad = await session.get(GroupAd, data.get("group_ad_id") or 0)
    if ad is None or ad.author_telegram_id != message.from_user.id:
        await state.clear()
        await message.answer("E'lon topilmadi. Guruhga qaytadan yozing.")
        return
    photo = message.photo[-1].file_id if message.photo else None
    ok = await group_ads_service.resubmit(message.bot, session, ad, text, photo)
    await state.clear()
    if ok:
        await message.answer("✅ Ma'lumotlaringiz yangilandi va haydovchilarga yuborildi. Tez orada siz bilan bog'lanishadi.")
    else:
        await message.answer("⚠️ Hozir yuborib bo'lmadi. Birozdan keyin guruhga qaytadan yozing.")


@router.callback_query(F.data.regexp(r"^gad:x:\d+$"))
async def cancel_ad(callback: CallbackQuery, state: FSMContext, session) -> None:
    ad = await _load(session, callback)
    if ad is None or ad.author_telegram_id != callback.from_user.id:
        await callback.answer("E'lon topilmadi.", show_alert=True)
        return
    await group_ads_service.cancel(callback.bot, session, ad)
    await state.clear()
    await callback.answer("E'lon bekor qilindi")
    await callback.message.edit_reply_markup()
    await callback.message.answer("❌ E'loningiz bekor qilindi. Kerak bo'lsa, guruhga qaytadan yozing.")
