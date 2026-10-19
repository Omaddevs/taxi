"""Smoke test (run before/after an aiogram upgrade): `python tests/smoke.py`. No network, no DB. Feeds fake updates to the kirish bot
dispatcher with a recording Telegram session and a stubbed backend, and builds the main bot's
dispatcher (imports every handler module)."""

import asyncio
import os
import sys
from datetime import datetime, timezone

BOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BOT_DIR)
os.environ.update(
    BOT_TOKEN="123456:TESTTOKEN",
    KIRISH_BOT_TOKEN="654321:TESTTOKEN",
    BOT_DATABASE_URL="postgresql+asyncpg://u:p@127.0.0.1:1/db",
    BOT_API_SECRET="secret",
    WEBAPP_URL="https://taxiline.uz",
)

from aiogram import Bot  # noqa: E402
from aiogram.client.session.base import BaseSession  # noqa: E402
from aiogram.types import Chat, Message, Update, User  # noqa: E402

sent: list[tuple[str, dict]] = []


class RecordingSession(BaseSession):
    async def make_request(self, bot, method, timeout=None):
        sent.append((type(method).__name__, method.model_dump(exclude_none=True)))
        if type(method).__name__ in ("SendMessage", "EditMessageText"):
            return Message(message_id=len(sent), date=datetime.now(timezone.utc), chat=Chat(id=42, type="private"), text="ok")
        return True

    async def stream_content(self, *args, **kwargs):  # pragma: no cover
        yield b""

    async def close(self):
        pass


ME = User(id=42, is_bot=False, first_name="Test")


def msg_update(uid, text=None, contact=None):
    data = dict(message_id=uid, date=datetime.now(timezone.utc), chat=Chat(id=42, type="private"), from_user=ME)
    if text is not None:
        data["text"] = text
    if contact is not None:
        data["contact"] = contact
    return Update(update_id=uid, message=Message(**data))


async def main():
    failures = []

    # Main bot: every handler module imports and the dispatcher builds.
    from app.main import build_dispatcher
    build_dispatcher()
    print("main dispatcher: built")

    from app.kirish.bot import build_kirish_dispatcher
    from app.services.backend_client import backend_client

    calls = []

    async def kirish_code(payload):
        calls.append(("code", payload))
        return {"status": "ok", "code": "123456", "phone": "+998901234567", "intent": payload["intent"], "expiresAt": None}

    async def kirish_phone_claim(payload):
        calls.append(("phone-claim", payload))
        return {"status": "ok", "phone": "+998901234567"}

    backend_client.kirish_code = kirish_code
    backend_client.kirish_phone_claim = kirish_phone_claim

    dp = build_kirish_dispatcher()
    bot = Bot("654321:TESTTOKEN", session=RecordingSession())

    # 1. plain /start → a sign-in code
    await dp.feed_update(bot, msg_update(1, "/start"))
    if not any(c[0] == "code" for c in calls):
        failures.append("/start did not ask the backend for a code")
    if not any("123456" in m[1].get("text", "") for m in sent):
        failures.append("/start did not send the code message")

    # 2. /start ph_<token> → asks for the contact, no code
    calls.clear(); sent.clear()
    token = "0123456789abcdef0123456789abcdef"
    await dp.feed_update(bot, msg_update(2, f"/start ph_{token}"))
    if calls:
        failures.append(f"/start ph_ called the backend: {calls}")
    if not any("Raqamni tasdiqlash" in m[1].get("text", "") for m in sent):
        failures.append("/start ph_ did not ask for the contact")
    if not any(m[1].get("reply_markup", {}).get("keyboard") for m in sent):
        failures.append("/start ph_ did not show the contact keyboard")

    # 3. sharing own contact → backend phone-claim with the token, success reply
    calls.clear(); sent.clear()
    from aiogram.types import Contact
    await dp.feed_update(bot, msg_update(3, contact=Contact(phone_number="998901234567", first_name="Test", user_id=42)))
    claim = [c for c in calls if c[0] == "phone-claim"]
    if not claim or claim[0][1].get("token") != token or claim[0][1].get("phone") != "998901234567":
        failures.append(f"contact did not reach phone-claim correctly: {calls}")
    if not any("Raqam tasdiqlandi" in m[1].get("text", "") for m in sent):
        failures.append("no success reply after the contact")

    # 4. someone else's contact is refused before the backend
    calls.clear(); sent.clear()
    await dp.feed_update(bot, msg_update(4, f"/start ph_{token}"))
    calls.clear(); sent.clear()
    await dp.feed_update(bot, msg_update(5, contact=Contact(phone_number="998900000000", first_name="X", user_id=999)))
    if calls:
        failures.append("a foreign contact reached the backend")

    await bot.session.close()
    print("kirish scenarios:", "OK" if not failures else "FAILED")
    for f in failures:
        print("  -", f)
    sys.exit(1 if failures else 0)


asyncio.run(main())
