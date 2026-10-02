from aiogram.fsm.state import State, StatesGroup


class SupportFlow(StatesGroup):
    entering_message = State()


class ComplaintFlow(StatesGroup):
    entering_text = State()
