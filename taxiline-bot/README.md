# taxiline-bot

Client-facing Telegram bot for **TaxiLine Uzbekistan** (aiogram 3, Python). It is a standalone
service with its own PostgreSQL database — the only thing it shares with `server/`/`apps/web/`
is user identity (phone-based lookup + a one-time login code for the WebApp button).

Driver-side features implemented here are a **minimal working version** (registration,
admin approval, region assignment, subscription) — a fuller driver TZ will extend this later.

## Setup

1. Python 3.11+ (this project was built/tested against 3.13).
2. Create a virtualenv and install dependencies:
   ```
   python -m venv .venv
   .venv\Scripts\activate   (Windows)  /  source .venv/bin/activate (Linux/Mac)
   pip install -r requirements.txt
   ```
3. Create the bot's own Postgres database (separate from `server/`'s `taxiline` DB):
   ```sql
   CREATE DATABASE taxiline_bot;
   ```
4. Copy `.env.example` to `.env` and fill in the values (a working `.env` with the bot token
   and closed-group ID you provided is already included for local dev — just adjust
   `BOT_DATABASE_URL` if your Postgres isn't on `localhost:5433`, and make sure
   `BOT_API_SECRET` here matches `BOT_API_SECRET` in `server/.env`).
5. Run migrations:
   ```
   alembic upgrade head
   ```
6. Make sure `server/` is running (`npm run dev -w server`) — the bot calls its `/bot/*` and
   `/auth/telegram-exchange` endpoints for shared identity.
7. Start the bot:
   ```
   python -m app.main
   ```

## Becoming the first admin

`SUPER_ADMIN_TELEGRAM_IDS` in `.env` is a comma-separated list of Telegram user IDs that get
`is_admin=True` automatically the moment they complete registration (`/start`) in the bot. Set
your own Telegram ID there before first run, then message the bot and go through
language → phone to get admin access and see the "🛠 Admin panel" button.

## What lives where

- `app/db/models.py` — the bot's own schema (`BotUser`, `DriverProfile`,
  `DriverSubscription`, `Group`, `Order`, `OrderDispatch`, `Complaint`, `SupportTicket`/
  `SupportMessage`, `Broadcast`). Migrations are hand-written under `alembic/versions/` (no
  live DB was available to `alembic revision --autogenerate` against during development in
  every environment, so migrations were authored to mirror the models exactly and verified by
  running them against a real Postgres instance).
- `app/services/backend_client.py` — the only code that talks to `server/`. Three endpoints:
  resolve a phone against the webapp's users, link/upsert a user with this Telegram identity,
  and mint a one-time WebApp login code.
- `app/services/trips.py` — order creation, dispatch to the region's closed driver group +
  approved/subscribed drivers' DMs (text + TTS voice note), and the freshness-label refresh
  used by the scheduler.
- `app/middlewares/group_guard.py` — per-group admin-configurable behavior: anti-spam,
  join/leave message deletion, 1-msg/min rate limit, and closed-group posting restriction
  (non-admin messages get deleted and reposted as a normalized card).
- `app/handlers/admin/` — group registration (bot must be added as admin to a group first;
  its `my_chat_member` handler then posts the chat ID to paste into the "Yangi guruh qo'shish"
  flow), driver approval/subscription, client block/unblock, the e'lon (broadcast) composer,
  complaints and support inboxes, and basic stats.
- `app/scheduler/jobs.py` — 15s inactivity-nudge sweep, 2min order-freshness relabel, 6h
  driver-subscription expiry sweep (notifies, deactivates, and kicks from the closed group).

## Known operational caveat: edge-tts network access

`app/tts/engine.py` uses the free, keyless `edge-tts` library, which opens a websocket to
Microsoft's public Edge Read Aloud service. Some hosting environments (corporate networks,
certain VPS/sandbox providers) block that outbound connection or get a `403` from Microsoft's
endpoint. Every call site wraps `synth()` in a broad try/except specifically because of this —
a TTS failure never blocks the underlying text message/dispatch/notification, it just means no
voice note gets attached that time. If voice messages never arrive in your deployment, test
`python -c "import asyncio; from app.tts.engine import synth; asyncio.run(synth('salom', 'uz'))"`
directly to confirm whether outbound network access to `speech.platform.bing.com` is available
from that host.

## Region/district data

`app/data/regions.py` covers all 14 top-level regions of Uzbekistan with a solid district
list for each, good enough to run the full trip-order flow. It's a plain Python dict — extend
or correct individual district lists there; nothing else in the codebase needs to change.
