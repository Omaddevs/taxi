from aiogram.fsm.state import State, StatesGroup


class Registration(StatesGroup):
    choosing_language = State()
    entering_phone = State()
    entering_name = State()


class LoginFlow(StatesGroup):
    entering_phone = State()
