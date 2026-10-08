from aiogram.fsm.state import State, StatesGroup


class RentBrowse(StatesGroup):
    """ "🛵 Skuter ijara": waiting for a location (or a listings / rental points tap)."""

    browsing = State()
