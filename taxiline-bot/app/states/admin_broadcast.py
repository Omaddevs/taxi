from aiogram.fsm.state import State, StatesGroup


class AdminBroadcast(StatesGroup):
    composing = State()  # waiting for the content message (text/photo/document/video/audio)
    adding_button = State()  # waiting for "Label | https://..." text, optional
    asking_tts = State()
    choosing_audience = State()
    confirming = State()


class AdminGroupSetup(StatesGroup):
    entering_chat_id = State()  # admin pastes the group's chat_id (shown when the bot is added)
    choosing_kind = State()
    choosing_region = State()
    # ROUTE-kind groups (one topic per direction pair) — adding one route to an already
    # registered group.
    choosing_route_from = State()
    choosing_route_to = State()
    entering_route_thread_id = State()


class AdminDriverAction(StatesGroup):
    entering_rejection_reason = State()


class AdminSupportReply(StatesGroup):
    entering_reply = State()


class AdminComplaintReply(StatesGroup):
    entering_reply = State()


class AdminMandatorySub(StatesGroup):
    entering_target = State()


class AdminClientSearch(StatesGroup):
    entering_query = State()


class AdminAddAdmin(StatesGroup):
    entering_telegram_id = State()


class AdminSubscriptionSearch(StatesGroup):
    entering_plate = State()
    entering_phone = State()
