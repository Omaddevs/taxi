import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class BackendClient:
    """Talks only to the small internal /bot/* API on server/ — the sole touchpoint for
    shared identity with the webapp (checking/creating a User by phone, and minting a
    one-time code the webapp exchanges for a real login)."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.server_api_url,
            headers={"X-Bot-Secret": settings.bot_api_secret},
            timeout=10.0,
        )

    async def resolve_user(self, phone: str) -> dict | None:
        resp = await self._client.post("/bot/resolve-user", json={"phone": phone})
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()["user"]

    async def link_user(
        self,
        phone: str,
        telegram_id: int,
        language: str,
        name: str | None = None,
        role: str | None = None,
        source: str = "BOT",
        username: str | None = None,
    ) -> dict:
        payload: dict = {
            "phone": phone,
            "telegramId": str(telegram_id),
            "language": language,
            "source": source,
        }
        if name:
            payload["name"] = name
        if role in ("PASSENGER", "DRIVER"):
            payload["role"] = role
        if username:
            payload["telegramUsername"] = username
        resp = await self._client.post("/bot/link-user", json=payload)
        resp.raise_for_status()
        return resp.json()["user"]

    async def touch_channel(self, telegram_id: int, source: str) -> None:
        try:
            resp = await self._client.post(
                "/bot/touch-channel",
                json={"telegramId": str(telegram_id), "source": source},
            )
            resp.raise_for_status()
        except Exception:
            logger.exception("touch_channel failed telegram_id=%s source=%s", telegram_id, source)

    async def sync_driver(
        self,
        *,
        phone: str,
        telegram_id: int,
        name: str | None,
        car_model: str,
        plate: str,
        approved: bool,
        status: str | None = None,
        new_application: bool = False,
        rejection_reason: str | None = None,
        gender: str | None = None,
        region: str | None = None,
        to_region: str | None = None,
        blocked: bool | None = None,
    ) -> dict | None:
        """Promote the core User to DRIVER and upsert the Driver row the webapp dashboard needs.
        Best-effort: a downed server must never block bot registration/approval."""
        payload: dict = {
            "phone": phone,
            "telegramId": str(telegram_id),
            "carModel": car_model,
            "plate": plate,
            "approved": approved,
            "newApplication": new_application,
        }
        if name:
            payload["name"] = name
        if status:
            payload["status"] = status
        if rejection_reason:
            payload["rejectionReason"] = rejection_reason
        if gender in ("MALE", "FEMALE"):
            payload["gender"] = gender
        if region:
            payload["region"] = region
        if to_region:
            payload["toRegion"] = to_region
        # Only an explicit (un)block by a bot admin sends this — a routine re-sync must never
        # undo a block set from the admin panel.
        if blocked is not None:
            payload["blocked"] = blocked
        try:
            resp = await self._client.post("/bot/sync-driver", json=payload)
            resp.raise_for_status()
            return resp.json()["user"]
        except Exception:
            logger.exception("sync_driver failed for phone=%s telegram_id=%s", phone, telegram_id)
            return None

    async def cargo_action(self, action: str, cargo_order_id: str, telegram_id: int) -> tuple[int, dict | None]:
        """Claim ("claim") or finish ("complete") a website cargo order for this Telegram
        driver. Returns the HTTP status and the JSON body (the order, or {"error": {...}})."""
        try:
            resp = await self._client.post(
                f"/bot/cargo-{action}", json={"cargoOrderId": cargo_order_id, "telegramId": str(telegram_id)}
            )
        except Exception:
            logger.exception("cargo %s failed for %s", action, cargo_order_id)
            return 503, None
        try:
            body = resp.json()
        except ValueError:
            body = None
        return resp.status_code, body

    async def rent_browse(self, kind: str, index: int, lat: float | None, lng: float | None) -> dict | None:
        """One "Skuter ijara" card (listing or rental point), nearest first when a location is
        given. None if the server can't be reached."""
        params: dict = {"kind": kind, "index": index}
        if lat is not None and lng is not None:
            params.update(lat=lat, lng=lng)
        try:
            resp = await self._client.get("/rentals/browse", params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            logger.exception("rent_browse failed")
            return None

    async def telegram_login_token(self, telegram_id: int) -> str | None:
        resp = await self._client.post("/bot/telegram-login-token", json={"telegramId": str(telegram_id)})
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()["code"]

    async def confirm_otp(self, phone: str, code: str) -> bool:
        """True if the webapp login code was valid and got consumed — the webapp's own poll
        picks this up and issues the actual session, this call has no session of its own."""
        resp = await self._client.post("/bot/otp-confirm", json={"phone": phone, "code": code})
        if resp.status_code in (400, 429):
            return False
        resp.raise_for_status()
        return True

    async def confirm_otp_by_request_id(
        self, otp_request_id: str, telegram_id: int, username: str | None = None
    ) -> str | None:
        """Confirms a webapp OTP request from the `t.me/<bot>?start=otp_<id>` deep link — the
        id itself (unguessable, single-use) is proof of ownership, no code re-entry needed.
        Returns the phone on success so the caller can greet the right person."""
        payload: dict = {"otpRequestId": otp_request_id, "telegramId": str(telegram_id)}
        if username:
            payload["telegramUsername"] = username
        resp = await self._client.post("/bot/otp-confirm-by-id", json=payload)
        if resp.status_code == 400:
            return None
        resp.raise_for_status()
        return resp.json()["phone"]

    async def submit_rating(
        self,
        *,
        rater_telegram_id: int,
        ratee_telegram_id: int,
        trip_ref: str,
        direction: str,
        stars: int,
        tags: list[str] | None = None,
        comment: str | None = None,
    ) -> bool:
        try:
            resp = await self._client.post(
                "/bot/rate",
                json={
                    "raterTelegramId": str(rater_telegram_id),
                    "rateeTelegramId": str(ratee_telegram_id),
                    "tripRef": trip_ref,
                    "direction": direction,
                    "stars": stars,
                    "tags": tags or [],
                    "comment": comment,
                },
            )
            resp.raise_for_status()
            return True
        except Exception:
            logger.exception("submit_rating failed for tripRef=%s", trip_ref)
            return False

    async def aclose(self) -> None:
        await self._client.aclose()


    async def giveaway_link(self, token: str, telegram_id: int, username: str | None = None) -> tuple[int, dict]:
        """Links a landing-page "Random mijoz" entry to this Telegram account and returns the
        (status_code, body) pair — 200 with membership status, 404 unknown token, 409 when the
        Telegram account is already used by another phone number."""
        payload: dict = {"token": token, "telegramId": str(telegram_id)}
        if username:
            payload["telegramUsername"] = username
        resp = await self._client.post("/bot/giveaway/link", json=payload, timeout=30.0)
        return resp.status_code, resp.json() if resp.content else {}

    async def giveaway_recheck(self, telegram_id: int) -> tuple[int, dict]:
        resp = await self._client.post("/bot/giveaway/recheck", json={"telegramId": str(telegram_id)}, timeout=30.0)
        return resp.status_code, resp.json() if resp.content else {}

backend_client = BackendClient()
