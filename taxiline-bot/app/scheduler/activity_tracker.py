import time

# telegram_id -> {"last": monotonic ts, "nudged": bool, "lang": str}. In-memory only — this
# tracks "is the user mid trip-order-flow right now", which is inherently process-local and
# fine to lose on a bot restart (worst case: one missed inactivity nudge).
_sessions: dict[int, dict] = {}


def touch(telegram_id: int, lang: str) -> None:
    _sessions[telegram_id] = {"last": time.monotonic(), "nudged": False, "lang": lang}


def clear(telegram_id: int) -> None:
    _sessions.pop(telegram_id, None)


def stale_entries(threshold_seconds: int) -> list[tuple[int, str]]:
    now = time.monotonic()
    return [
        (telegram_id, info["lang"])
        for telegram_id, info in _sessions.items()
        if not info["nudged"] and now - info["last"] >= threshold_seconds
    ]


def mark_nudged(telegram_id: int) -> None:
    if telegram_id in _sessions:
        _sessions[telegram_id]["nudged"] = True
