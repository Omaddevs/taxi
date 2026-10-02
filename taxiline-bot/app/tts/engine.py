import hashlib
import os

import edge_tts

from app.config import settings

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
        return path

    voice = VOICES.get(lang, VOICES["uz"])
    communicate = edge_tts.Communicate(text, voice)
    try:
        await communicate.save(path)
    except Exception:
        # communicate.save() writes incrementally, so a mid-stream failure (e.g. the edge-tts
        # websocket being blocked/rejected) can leave a truncated/empty file behind. Without
        # this cleanup, every later request for the same text would find that broken file via
        # the os.path.exists check above and hand it out forever instead of retrying.
        if os.path.exists(path):
            os.remove(path)
        raise
    return path
