from aiogram.fsm.state import State, StatesGroup


class SettingsFlow(StatesGroup):
    entering_name = State()
    entering_phone = State()
    entering_address = State()
