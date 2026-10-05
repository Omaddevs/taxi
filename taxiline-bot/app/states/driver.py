from aiogram.fsm.state import State, StatesGroup


class DriverApplication(StatesGroup):
    entering_name = State()
    entering_phone = State()
    choosing_car = State()
    entering_plate = State()
    choosing_region = State()
    choosing_to_region = State()
    confirming = State()


class DriverProfileEdit(StatesGroup):
    """Separate from DriverApplication — an approved driver editing one field of an already
    -approved profile is a distinct flow from the multi-step new-application wizard, even
    though several steps reuse the same prompts/keyboards."""

    entering_name = State()
    entering_phone = State()
    choosing_car = State()
    entering_plate = State()
    choosing_region = State()
    choosing_to_region = State()
