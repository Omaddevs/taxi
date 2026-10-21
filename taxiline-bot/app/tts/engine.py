import asyncio
import hashlib
import logging
import os
import time

import edge_tts

from app.config import settings

logger = logging.getLogger(__name__)
ATTEMPTS = 3
# Every distinct text gets its own MP3 and nothing else removes them, so prune_cache() keeps the
# folder bounded: files unused for CACHE_MAX_AGE go, then the least recently used until it fits.
CACHE_MAX_AGE = 30 * 24 * 60 * 60
CACHE_MAX_BYTES = 200 * 1024 * 1024

VOICES = {
    "uz": "uz-UZ-SardorNeural",
    "ru": "ru-RU-DmitryNeural",
    "en": "en-US-GuyNeural",
}


def _cache_path(text: str, lang: str) -> str:
    key = hashlib.sha256(f"{lang}:{text}".encode("utf-8")).hexdigest()
    # edge-tts returns MP3 audio (not OGG/OPUS), so callers must send it with bot.send_audio,
    # not send_voice (which requires OPUS-in-OGG).
    return os.path.join(settings.tts_cache_dir, f"{key}.mp3")


async def synth(text: str, lang: str) -> str:
    """Synthesize `text` into an MP3 audio file in `lang`, caching by content hash so repeated
    phrases (canned reminders, re-sent broadcasts) never hit the network twice."""
    os.makedirs(settings.tts_cache_dir, exist_ok=True)
    path = _cache_path(text, lang)
    if os.path.exists(path):
        # A hit marks the file as recently used, so prune_cache() keeps phrases that are still sent.
        try:
            os.utime(path)
        except OSError:
            pass
        return path

    voice = VOICES.get(lang, VOICES["uz"])
    # The free edge-tts endpoint now and then answers a request with no audio; a retry almost
    # always succeeds, so try a few times before giving up.
    for attempt in range(1, ATTEMPTS + 1):
        try:
            await edge_tts.Communicate(text, voice).save(path)
            return path
        except Exception:
            # communicate.save() writes incrementally, so a mid-stream failure (e.g. the edge-tts
            # websocket being blocked/rejected) can leave a truncated/empty file behind. Without
            # this cleanup, every later request for the same text would find that broken file via
            # the os.path.exists check above and hand it out forever instead of retrying.
            if os.path.exists(path):
                os.remove(path)
            if attempt == ATTEMPTS:
                logger.warning("TTS failed after %s attempts (lang=%s)", ATTEMPTS, lang, exc_info=True)
                raise
            await asyncio.sleep(0.5 * attempt)
    return path


def prune_cache(now: float | None = None) -> int:
    """Delete cached MP3s unused for CACHE_MAX_AGE, then the oldest until the folder is under
    CACHE_MAX_BYTES. Returns how many files were removed."""
    now = time.time() if now is None else now
    try:
        entries = [e for e in os.scandir(settings.tts_cache_dir) if e.is_file() and e.name.endswith(".mp3")]
    except FileNotFoundError:
        return 0
    files = []
    for e in entries:
        try:
            st = e.stat()
        except OSError:
            continue
        files.append((st.st_mtime, st.st_size, e.path))
    files.sort()  # least recently used first

    total = sum(size for _, size, _ in files)
    removed = 0
    for mtime, size, path in files:
        if now - mtime <= CACHE_MAX_AGE and total <= CACHE_MAX_BYTES:
            break
        try:
            os.remove(path)
        except OSError:
            continue
        total -= size
        removed += 1
    if removed:
        logger.info("TTS cache: removed %s files, %s bytes left", removed, total)
    return removed
