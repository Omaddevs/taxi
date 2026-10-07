from aiogram.fsm.state import State, StatesGroup


class TripOrder(StatesGroup):
    confirming_phone = State()
    entering_new_phone = State()
    entering_location = State()
    choosing_from_region = State()
    choosing_from_district = State()
    choosing_to_region = State()
    choosing_to_district = State()
    choosing_car = State()
    choosing_seat = State()
    choosing_passengers = State()
    choosing_gender = State()
    choosing_luggage = State()
    entering_time = State()
    confirming_order = State()
