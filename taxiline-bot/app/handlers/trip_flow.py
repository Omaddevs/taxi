from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from aiogram import BaseMiddleware, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message, ReplyKeyboardRemove, TelegramObject

from app.data.regions import REGION_NAMES, REGIONS
from app.handlers.start import send_main_menu
from app.i18n.translations import t
from app.keyboards.common import menu_text, share_location_kb, yes_no_kb
from app.keyboards.regions import districts_kb, regions_kb
from app.keyboards.trip import (
    car_brand_kb,
    luggage_kb,
    luggage_label,
    order_confirm_kb,
    order_edit_kb,
    passenger_gender_kb,
    passengers_kb,
    seat_kb,
    seat_label,
    time_kb,
)
from app.data.cars import CAR_BRANDS
from app.scheduler import activity_tracker
from app.services.phone import format_phone, normalize_phone
from app.services.stats import TASHKENT
from app.services.trips import created_message_key, create_order, dispatch_order, passenger_gender_line
from app.states.trip import TripOrder

router = Router(name="trip_flow")


class ActivityTouchMiddleware(BaseMiddleware):
    """Resets the inactivity clock every time a message/callback actually reaches a trip-flow
    handler, so the scheduler's 60s-idle nudge measures real inactivity, not wall-clock time
    since the flow started."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        bot_user = data.get("bot_user")
        if bot_user is not None:
            activity_tracker.touch(bot_user.telegram_id, data.get("lang", "uz"))
        return await handler(event, data)


router.message.middleware(ActivityTouchMiddleware())
router.callback_query.middleware(ActivityTouchMiddleware())


@router.message(menu_text("menu_start_trip"))
async def start_trip(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    await _begin_trip(message, state, bot_user, lang, women_only=False)


@router.message(menu_text("menu_women_trip"))
async def start_women_trip(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    """"Ayollar uchun taxi": the same order wizard, but the order is flagged women-only — it
    goes to female drivers only and the "who travels" step is skipped (always a woman)."""
    if bot_user is None:
        return
    await message.answer(t("women_trip_intro", lang))
    await _begin_trip(message, state, bot_user, lang, women_only=True)


async def _begin_trip(message: Message, state: FSMContext, bot_user, lang: str, *, women_only: bool) -> None:
    if bot_user is None:
        return
    await state.clear()
    await state.update_data(women_only=women_only, passenger_gender="FEMALE" if women_only else None)
    phone = bot_user.phone or ""
    await message.answer(
        t("confirm_phone", lang, phone=format_phone(phone)),
        reply_markup=yes_no_kb(lang, "trip:phone:yes", "trip:phone:no"),
    )
    await state.set_state(TripOrder.confirming_phone)


@router.callback_query(TripOrder.confirming_phone, F.data == "trip:phone:yes")
async def confirm_phone_yes(callback: CallbackQuery, state: FSMContext, bot_user, lang: str) -> None:
    await state.update_data(passenger_phone=bot_user.phone, passenger_name=bot_user.name or callback.from_user.full_name)
    await callback.answer()
    await callback.message.edit_reply_markup()
    await _ask_location(callback.message, lang)
    await state.set_state(TripOrder.entering_location)


@router.callback_query(TripOrder.confirming_phone, F.data == "trip:phone:no")
async def confirm_phone_no(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_reply_markup()
    await callback.message.answer(t("ask_new_phone", lang))
    await state.set_state(TripOrder.entering_new_phone)


@router.message(TripOrder.entering_new_phone, F.text)
async def enter_new_phone(message: Message, state: FSMContext, bot_user, lang: str) -> None:
    phone = normalize_phone(message.text)
    if not phone:
        await message.answer(t("invalid_phone", lang))
        return
    await state.update_data(passenger_phone=phone, passenger_name=bot_user.name or message.from_user.full_name)
    if await _finish_edit(message, state, lang, edit=False):
        return
    await _ask_location(message, lang)
    await state.set_state(TripOrder.entering_location)


async def _ask_location(message: Message, lang: str) -> None:
    await message.answer(t("ask_location", lang), reply_markup=share_location_kb(lang))


@router.message(TripOrder.entering_location, F.location)
async def location_via_geo(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(pickup_lat=message.location.latitude, pickup_lng=message.location.longitude, pickup_text=None)
    await _after_location(message, state, lang)


@router.message(TripOrder.entering_location, F.text)
async def location_via_text(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(pickup_text=message.text, pickup_lat=None, pickup_lng=None)
    await _after_location(message, state, lang)


async def _after_location(message: Message, state: FSMContext, lang: str) -> None:
    # Clears the "share location" reply keyboard — otherwise it lingers at the bottom of the
    # chat through every remaining (inline-only) step of the flow instead of disappearing
    # right after use.
    await message.answer(t("location_received_ack", lang), reply_markup=ReplyKeyboardRemove())
    await message.answer(t("ask_from_region", lang), reply_markup=regions_kb("from"))
    await state.set_state(TripOrder.choosing_from_region)


@router.callback_query(TripOrder.choosing_from_region, F.data.startswith("from:r:"))
async def pick_from_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    region = REGION_NAMES[idx]
    await state.update_data(from_region=region)
    await callback.answer()
    await callback.message.edit_text(
        t("ask_from_district", lang, region=region), reply_markup=districts_kb("from", idx)
    )
    await state.set_state(TripOrder.choosing_from_district)


@router.callback_query(TripOrder.choosing_from_district, F.data.startswith("from:d:"))
async def pick_from_district(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    _, _, ridx, didx = callback.data.split(":")
    region = REGION_NAMES[int(ridx)]
    district = REGIONS[region][int(didx)]
    await state.update_data(from_district=district)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_to_region", lang), reply_markup=regions_kb("to"))
    await state.set_state(TripOrder.choosing_to_region)


@router.callback_query(TripOrder.choosing_to_region, F.data.startswith("to:r:"))
async def pick_to_region(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    region = REGION_NAMES[idx]
    await state.update_data(to_region=region)
    await callback.answer()
    await callback.message.edit_text(t("ask_to_district", lang, region=region), reply_markup=districts_kb("to", idx))
    await state.set_state(TripOrder.choosing_to_district)


@router.callback_query(TripOrder.choosing_to_district, F.data.startswith("to:d:"))
async def pick_to_district(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    _, _, ridx, didx = callback.data.split(":")
    region = REGION_NAMES[int(ridx)]
    district = REGIONS[region][int(didx)]
    await state.update_data(to_district=district)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_car_brand", lang), reply_markup=car_brand_kb())
    await state.set_state(TripOrder.choosing_car)


@router.callback_query(TripOrder.choosing_car, F.data.startswith("trip:car:"))
async def pick_car(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    idx = int(callback.data.split(":")[-1])
    await state.update_data(car_brand=CAR_BRANDS[idx])
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_seat", lang), reply_markup=seat_kb(lang))
    await state.set_state(TripOrder.choosing_seat)


@router.callback_query(TripOrder.choosing_seat, F.data.startswith("trip:seat:"))
async def pick_seat(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    seat = callback.data.split(":")[-1]
    await state.update_data(seat=seat)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_passengers", lang), reply_markup=passengers_kb())
    await state.set_state(TripOrder.choosing_passengers)


@router.callback_query(TripOrder.choosing_passengers, F.data.startswith("trip:pax:"))
async def pick_passengers(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    n = int(callback.data.split(":")[-1])
    await state.update_data(passengers=n)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    if (await state.get_data()).get("women_only"):
        await callback.message.edit_text(t("ask_luggage", lang), reply_markup=luggage_kb(lang))
        await state.set_state(TripOrder.choosing_luggage)
        return
    await callback.message.edit_text(t("ask_passenger_gender", lang), reply_markup=passenger_gender_kb(lang))
    await state.set_state(TripOrder.choosing_gender)


@router.callback_query(TripOrder.choosing_gender, F.data.startswith("trip:pg:"))
async def pick_passenger_gender(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    gender = callback.data.split(":")[-1]
    if gender not in ("MALE", "FEMALE", "COUPLE"):
        await callback.answer()
        return
    await state.update_data(passenger_gender=gender)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_luggage", lang), reply_markup=luggage_kb(lang))
    await state.set_state(TripOrder.choosing_luggage)


@router.callback_query(TripOrder.choosing_luggage, F.data.startswith("trip:lug:"))
async def pick_luggage(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    code = callback.data.split(":")[-1]
    await state.update_data(luggage_size=code)
    await callback.answer()
    if await _finish_edit(callback.message, state, lang, edit=True):
        return
    await callback.message.edit_text(t("ask_time", lang), reply_markup=time_kb(lang))
    await state.set_state(TripOrder.entering_time)


@router.callback_query(TripOrder.entering_time, F.data == "trip:time:now")
async def pick_time_now(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await state.update_data(when_text=datetime.now(TASHKENT).strftime("%H:%M"))
    await callback.answer()
    await _show_summary(callback.message, state, lang, edit=True)


@router.message(TripOrder.entering_time, F.text)
async def pick_time_text(message: Message, state: FSMContext, lang: str) -> None:
    await state.update_data(when_text=message.text.strip())
    await _show_summary(message, state, lang, edit=False)


async def _finish_edit(message: Message, state: FSMContext, lang: str, *, edit: bool) -> bool:
    """When the step was reached from the summary's edit menu, jumps straight back to the
    summary instead of continuing the linear flow. Returns True if it did."""
    if not (await state.get_data()).get("editing"):
        return False
    await _show_summary(message, state, lang, edit=edit)
    return True


async def _show_summary(message: Message, state: FSMContext, lang: str, *, edit: bool) -> None:
    await state.update_data(editing=False)
    data = await state.get_data()
    text = t(
        "order_summary",
        lang,
        service_line=t("summary_women_line", lang) if data.get("women_only") else "",
        gender_line=passenger_gender_line(data.get("passenger_gender"), lang),
        passenger_name=data["passenger_name"],
        passenger_phone=format_phone(data["passenger_phone"]),
        from_region=data["from_region"],
        from_district=data["from_district"],
        to_region=data["to_region"],
        to_district=data["to_district"],
        car_brand=data["car_brand"],
        seat=seat_label(data["seat"], lang),
        passengers=data["passengers"],
        luggage_size=luggage_label(data["luggage_size"], lang),
        when_text=data["when_text"],
    )
    kb = order_confirm_kb(lang)
    if edit:
        await message.edit_text(text, reply_markup=kb)
    else:
        await message.answer(text, reply_markup=kb)
    await state.set_state(TripOrder.confirming_order)


@router.callback_query(TripOrder.confirming_order, F.data == "trip:confirm")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    data = await state.get_data()
    await callback.answer()
    await callback.message.edit_reply_markup()

    order = await create_order(session, bot_user, {**data, "for_someone_else": False, "source": "BOT"})
    sent = await dispatch_order(callback.bot, session, order)

    activity_tracker.clear(bot_user.telegram_id)
    await state.clear()

    if sent == 0:
        await callback.message.answer(t("no_group_for_region", lang))
    else:
        await callback.message.answer(t(created_message_key(order), lang))
    await send_main_menu(callback.message, session, bot_user, lang)


@router.callback_query(TripOrder.confirming_order, F.data == "trip:edit")
async def edit_order(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    women_only = bool((await state.get_data()).get("women_only"))
    await callback.message.edit_text(t("ask_edit_field", lang), reply_markup=order_edit_kb(lang, women_only))


@router.callback_query(TripOrder.confirming_order, F.data == "trip:edit:back")
async def edit_order_back(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    await callback.answer()
    await _show_summary(callback.message, state, lang, edit=True)


# field -> (prompt key, keyboard factory, state). Phone is handled separately because its
# prompt is a plain text request rather than an inline-keyboard choice.
_EDIT_STEPS = {
    "from": ("ask_from_region", lambda lang: regions_kb("from"), TripOrder.choosing_from_region),
    "to": ("ask_to_region", lambda lang: regions_kb("to"), TripOrder.choosing_to_region),
    "car": ("ask_car_brand", lambda lang: car_brand_kb(), TripOrder.choosing_car),
    "seat": ("ask_seat", seat_kb, TripOrder.choosing_seat),
    "passengers": ("ask_passengers", lambda lang: passengers_kb(), TripOrder.choosing_passengers),
    "gender": ("ask_passenger_gender", passenger_gender_kb, TripOrder.choosing_gender),
    "luggage": ("ask_luggage", luggage_kb, TripOrder.choosing_luggage),
    "time": ("ask_time", time_kb, TripOrder.entering_time),
}


@router.callback_query(TripOrder.confirming_order, F.data.startswith("trip:edit:"))
async def edit_order_field(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    field = callback.data.split(":")[-1]
    await callback.answer()
    await state.update_data(editing=True)
    if field == "phone":
        await callback.message.edit_reply_markup()
        await callback.message.answer(t("ask_new_phone", lang))
        await state.set_state(TripOrder.entering_new_phone)
        return
    if field not in _EDIT_STEPS:
        return
    prompt_key, kb_factory, next_state = _EDIT_STEPS[field]
    await callback.message.edit_text(t(prompt_key, lang), reply_markup=kb_factory(lang))
    await state.set_state(next_state)


@router.callback_query(TripOrder.confirming_order, F.data == "trip:cancel")
async def cancel_order(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    await callback.message.edit_reply_markup()
    activity_tracker.clear(bot_user.telegram_id)
    await state.clear()
    await callback.message.answer(t("order_cancelled", lang), reply_markup=ReplyKeyboardRemove())
    await send_main_menu(callback.message, session, bot_user, lang)


@router.callback_query(F.data == "trip:nudge:yes")
async def nudge_yes(callback: CallbackQuery, bot_user, lang: str) -> None:
    await callback.answer(t("trip_continued", lang))
    if bot_user is not None:
        activity_tracker.touch(bot_user.telegram_id, lang)
    await callback.message.delete()


@router.callback_query(F.data == "trip:nudge:no")
async def nudge_no(callback: CallbackQuery, state: FSMContext, session, bot_user, lang: str) -> None:
    await callback.answer()
    await state.clear()
    if bot_user is not None:
        activity_tracker.clear(bot_user.telegram_id)
    await callback.message.delete()
    await callback.message.answer(t("trip_stopped", lang), reply_markup=ReplyKeyboardRemove())
    if bot_user is not None:
        await send_main_menu(callback.message, session, bot_user, lang)
