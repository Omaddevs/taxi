from aiogram.fsm.state import State, StatesGroup


class GroupAdResubmit(StatesGroup):
    """«Yuborish» from a group notice: waiting for the passenger's new ad text (or photo)."""

    entering_text = State()
