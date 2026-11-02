from aiogram.fsm.state import State, StatesGroup


class ParcelOrder(StatesGroup):
    choosing_from_region = State()
    choosing_from_district = State()
    choosing_to_region = State()
    choosing_to_district = State()
    choosing_type = State()
    choosing_weight = State()
    entering_recipient_name = State()
    entering_recipient_phone = State()
    entering_note = State()
    choosing_price = State()
    entering_price = State()
    confirming = State()
