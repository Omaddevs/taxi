"""Turns a free-form taxi ad posted in a group ("✈️ SAMARQAND SHAXARDAN 🏡 TOSHKENTGA ...
☎️ +998902412626") into one uniform card. Parsing is plain rules — a place dictionary, regexes
for phones/times/seats and a few keyword lists — so it costs nothing per message and never
invents a phone number. Anything without a recognisable route is left alone (questions,
chatter), which is why `parse_ad` returns None rather than a half-empty card.
"""

import html
import re
from dataclasses import dataclass, field
from urllib.parse import quote

from aiogram.types import CopyTextButton, InlineKeyboardMarkup, User
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import settings
from app.services.phone import format_phone

_CYR_TO_LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya", "ў": "o", "қ": "q", "ғ": "g",
    "ҳ": "h",
}
_APOSTROPHES_RE = re.compile(r"[ʻʼ'`‘’]")


def _key(text: str) -> str:
    """Spelling-insensitive form for matching: Cyrillic → Latin, no apostrophes, q→k, x→h,
    so "САМАРКАНД", "Samarqand" and "samarkand" all become "samarkand"."""
    out = "".join(_CYR_TO_LAT.get(ch, ch) for ch in text.lower())
    out = _APOSTROPHES_RE.sub("", out)
    return out.replace("kh", "h").replace("dj", "j").replace("q", "k").replace("x", "h")


# Display name -> spellings people actually use. Only names unlikely to be ordinary words.
_PLACES: dict[str, tuple[str, ...]] = {
    "Toshkent": ("toshkent", "tashkent"),
    "Samarqand": ("samarqand", "samarkant"),
    "Urgut": ("urgut",),
    "Jartepa": ("jartepa",),
    "Toyloq": ("toyloq", "tayloq"),
    "Mitan": ("mitan",),
    "Chelak": ("chelak",),
    "Kattaqo'rg'on": ("kattaqorgon", "kattakurgan", "kattaqurgon"),
    "Ishtixon": ("ishtixon",),
    "Jomboy": ("jomboy", "jambay"),
    "Bulung'ur": ("bulungur",),
    "Payariq": ("payariq",),
    "Oqdaryo": ("oqdaryo", "akdarya"),
    "Pastdarg'om": ("pastdargom",),
    "Nurobod": ("nurobod",),
    "Narpay": ("narpay",),
    "Qo'shrabot": ("qoshrabot",),
    "Paxtachi": ("paxtachi",),
    "Loyish": ("loyish",),
    "Jizzax": ("jizzax", "jizzak", "jizak"),
    "Zomin": ("zomin",),
    "G'allaorol": ("gallaorol", "gallyaaral"),
    "Guliston": ("guliston", "gulistan"),
    "Yangiyer": ("yangiyer",),
    "Navoiy": ("navoiy", "navoi"),
    "Zarafshon": ("zarafshon", "zarafshan"),
    "Buxoro": ("buxoro", "buxara"),
    "G'ijduvon": ("gijduvon",),
    "Kogon": ("kogon", "kagan"),
    "Qarshi": ("qarshi",),
    "Shahrisabz": ("shahrisabz",),
    "G'uzor": ("guzor",),
    "Termiz": ("termiz", "termez"),
    "Denov": ("denov", "denau"),
    "Andijon": ("andijon", "andijan"),
    "Namangan": ("namangan",),
    "Farg'ona": ("fargona", "fergana"),
    "Qo'qon": ("qoqon", "kokand"),
    "Marg'ilon": ("margilon", "margilan"),
    "Urganch": ("urganch", "urgench"),
    "Xiva": ("xiva",),
    "Nukus": ("nukus",),
    "Angren": ("angren",),
    "Olmaliq": ("olmaliq", "almalik"),
    "Chirchiq": ("chirchiq",),
    "Bekobod": ("bekobod", "bekabad"),
    "Yangiyo'l": ("yangiyol",),
    "Ohangaron": ("ohangaron", "ahangaran"),
    "Chinoz": ("chinoz",),
}
# (alias key, display) longest first so "kattakorgon" wins over any shorter prefix.
_PLACE_ALIASES = sorted(
    ((_key(alias), name) for name, aliases in _PLACES.items() for alias in aliases),
    key=lambda pair: -len(pair[0]),
)
_FROM_SUFFIXES = ("dan", "tan")
_TO_SUFFIXES = ("gacha", "kacha", "ga", "ka")
_OTHER_SUFFIXES = ("", "da", "dagi", "ni", "ning", "lik", "a", "e", "u", "om")
# A filler word right after a place that carries the direction: "Samarqand SHAHARDAN".
_FROM_FILLERS = {"shahardan", "shahridan", "tumanidan", "tumandan", "viloyatidan"}
_TO_FILLERS = {"shaharga", "shahriga", "tumaniga", "tumanga", "viloyatiga"}
_RU_FROM = {"iz", "s", "ot"}
_RU_TO = {"v", "vo", "do", "na"}
_ARROW = "zzarrow"
_ARROW_RE = re.compile(r"→|➡️?|➜|⇒|->|—>|=>|➝|⟶")
_DASH_BETWEEN_WORDS_RE = re.compile(r"(?<=[^\W\d_])\s*[-–—]\s*(?=[^\W\d_])")

_PHONE_RE = re.compile(
    r"(?<!\d)(\+?\s*998)?[\s\-().]*(\d{2})[\s\-().]*(\d{3})[\s\-().]*(\d{2})[\s\-().]*(\d{2})(?!\d)"
)
# Without the 998 prefix only real Uzbek mobile codes count, so "11 00 12 00"-ish digit runs
# don't become phones.
_MOBILE_CODES = {"20", "33", "50", "55", "61", "77", "88", "90", "91", "93", "94", "95", "97", "98", "99"}

_TIME_RE = re.compile(r"(?<!\d)([01]?\d|2[0-3])\s*[:.;]\s*([0-5]\d)(?!\d)")
_SOAT_RE = re.compile(r"\b(?:soat|sogat|soati)\s*(\d{1,2})\b")
_DAY_WORDS = (
    (("ertaga", "zavtra"), "Ertaga"),
    (("bugun", "segodnya"), "Bugun"),
    (("hozir", "hozirda", "seychas", "tayyor"), "Hozir"),
)

_NUMBER_WORDS = {"bir": 1, "bitta": 1, "ikki": 2, "ikkita": 2, "uch": 3, "uchta": 3, "tort": 4, "tortta": 4}
_SEAT_NOUNS = r"(?:joy|kishi|nafar|odam|yolovchi|mest[oa]|chelovek)"
_SEATS_RE = re.compile(r"\b(\d|" + "|".join(_NUMBER_WORDS) + r")\s*(?:ta\s+)?" + _SEAT_NOUNS + r"(\w*)")
_FREE_SEATS_RE = re.compile(r"\bbosh\s*joy\w*\s*(\d)\b")

_CARS: dict[str, tuple[str, ...]] = {
    "Cobalt": ("cobalt", "kobalt"),
    "Gentra": ("gentra", "jentra"),
    "Lacetti": ("lacetti", "lasetti", "laceti"),
    "Nexia": ("nexia", "neksiya", "nexiya", "neksia"),
    "Spark": ("spark",),
    "Captiva": ("captiva", "kaptiva"),
    "Malibu": ("malibu",),
    "Tracker": ("tracker", "treker", "traker"),
    "Onix": ("onix", "oniks"),
    "Monza": ("monza",),
    "Epica": ("epica", "epika"),
    "Damas": ("damas",),
    "Largus": ("largus",),
    "Kia K5": ("k5",),
    "BYD": ("byd",),
}
_CAR_ALIASES = [(_key(alias), name) for name, aliases in _CARS.items() for alias in aliases]
_CARGO_WORDS = ("pochta", "posilka", "posylka", "pochtalar")

# Checked before passenger markers: drivers write "olib ketamiz", which contains "ketamiz".
_DRIVER_MARKERS = ("yuramiz", "yuraman", "olamiz", "olaman", "olib ketamiz", "olib ketaman", "joy bor",
                   "bosh joy", "haydovchi", "shofyor", "voditel")
_PASSENGER_MARKERS = ("mashina kerak", "taksi kerak", "tahi kerak", "ketaman", "ketamiz", "boraman",
                      "boramiz", "yolovchiman", "yolovchimiz", "olib ketadigan")


@dataclass
class ParsedAd:
    origins: list[str]
    destinations: list[str]
    is_passenger: bool = False
    phones: list[str] = field(default_factory=list)
    departure: str | None = None
    seats: int | None = None
    car: str | None = None
    takes_cargo: bool = False


def _find_place(token: str) -> tuple[str, str] | None:
    for alias, name in _PLACE_ALIASES:
        if not token.startswith(alias):
            continue
        rest = token[len(alias):]
        if rest in _FROM_SUFFIXES:
            return name, "from"
        if rest in _TO_SUFFIXES:
            return name, "to"
        if rest in _OTHER_SUFFIXES:
            return name, ""
    return None


def _parse_route(key_text: str) -> tuple[list[str], list[str]]:
    text = _ARROW_RE.sub(f" {_ARROW} ", key_text)
    text = _DASH_BETWEEN_WORDS_RE.sub(f" {_ARROW} ", text)
    tokens = re.findall(r"[a-z0-9]+", text)

    mentions: list[list] = []  # [place, role, after_arrow]
    seen_arrow = False
    for i, token in enumerate(tokens):
        if token == _ARROW:
            seen_arrow = True
            continue
        if token in _FROM_FILLERS or token in _TO_FILLERS:
            if mentions and not mentions[-1][1]:
                mentions[-1][1] = "from" if token in _FROM_FILLERS else "to"
            continue
        found = _find_place(token)
        if found is None:
            continue
        name, role = found
        if not role and i > 0:
            if tokens[i - 1] in _RU_FROM:
                role = "from"
            elif tokens[i - 1] in _RU_TO:
                role = "to"
        mentions.append([name, role, seen_arrow])

    if not mentions:
        return [], []

    destinations = [m[0] for m in mentions if m[1] == "to"]
    if not destinations and seen_arrow:
        destinations = [m[0] for m in mentions if m[2] and m[1] != "from"]
    if not destinations:
        destinations = [mentions[-1][0]]

    origins = [m[0] for m in mentions if m[1] == "from" or (not m[1] and m[0] not in destinations)]
    origins = list(dict.fromkeys(origins))
    destinations = list(dict.fromkeys(destinations))
    # Round trips ("Toshkent → Samarqand → Toshkent"): a place that is already an origin only
    # stays a destination if it's the only one.
    trimmed = [d for d in destinations if d not in origins]
    return origins, trimmed or destinations


def _parse_phones(raw: str) -> list[str]:
    phones = []
    for match in _PHONE_RE.finditer(raw):
        prefix, code = match.group(1), match.group(2)
        if not prefix and code not in _MOBILE_CODES:
            continue
        phones.append("+998" + "".join(match.groups()[1:]))
    return list(dict.fromkeys(phones))


def _parse_departure(key_text: str) -> str | None:
    times = [f"{int(h):02d}:{m}" for h, m in _TIME_RE.findall(key_text)]
    times += [f"{int(h):02d}:00" for h in _SOAT_RE.findall(key_text) if int(h) <= 23]
    times = list(dict.fromkeys(times))[:4]

    day = None
    words = set(re.findall(r"[a-z]+", key_text))
    for variants, label in _DAY_WORDS:
        if words.intersection(variants):
            day = label
            break

    if day == "Hozir" and not times:
        return "Hozir"
    if times:
        return f"{day}, {', '.join(times)}" if day and day != "Hozir" else ", ".join(times)
    return day


def _parse_seats(key_text: str) -> int | None:
    free = _FREE_SEATS_RE.search(key_text)
    if free:
        return int(free.group(1))
    for number, suffix in _SEATS_RE.findall(key_text):
        if suffix.startswith("li"):  # "6 kishilik" is the car's capacity, not free seats
            continue
        value = int(number) if number.isdigit() else _NUMBER_WORDS[number]
        if 1 <= value <= 8:
            return value
    return None


def _parse_car(key_text: str) -> str | None:
    tokens = set(re.findall(r"[a-z0-9]+", key_text))
    for alias, name in _CAR_ALIASES:
        if alias in tokens:
            return name
    return None


def _is_passenger(key_text: str) -> bool:
    flat = " ".join(re.findall(r"[a-z0-9]+", key_text))
    if any(marker in flat for marker in _DRIVER_MARKERS):
        return False
    return any(marker in flat for marker in _PASSENGER_MARKERS)


def parse_ad(raw: str) -> ParsedAd | None:
    if not raw or not raw.strip():
        return None
    phones = _parse_phones(raw)
    # Phones out first, so their digit groups never read as departure times or seat counts.
    key_text = _key(_PHONE_RE.sub(" ", raw))
    origins, destinations = _parse_route(key_text)
    if not origins or not destinations:
        return None
    return ParsedAd(
        origins=origins,
        destinations=destinations,
        is_passenger=_is_passenger(key_text),
        phones=phones,
        departure=_parse_departure(key_text),
        seats=_parse_seats(key_text),
        car=_parse_car(key_text),
        takes_cargo=any(word in key_text for word in _CARGO_WORDS),
    )


def _profile_url(user: User) -> str:
    return f"https://t.me/{user.username}" if user.username else f"tg://user?id={user.id}"


def render_card(ad: ParsedAd, author: User, author_name: str) -> str:
    """HTML for parse_mode="HTML". Rows the ad didn't mention are left out, not shown empty."""
    who = "Yo'lovchi" if ad.is_passenger else "Haydovchi"
    subtitle = "Yo'lovchi e'loni — mashina qidirilmoqda" if ad.is_passenger else "Yo'lovchi tashish e'loni"
    route = f"{' / '.join(ad.origins)} → {' / '.join(ad.destinations)}".upper()

    lines = [
        "🚕 <b>TAXILINE</b>  ·  🟢 Faol",
        f"<i>{subtitle}</i>",
        "➖➖➖➖➖➖➖➖➖➖",
        f"📍 <b>{html.escape(route)}</b>",
    ]
    if ad.departure:
        lines += ["", "🕐 <b>Jo'nash vaqti</b>", html.escape(ad.departure)]
    if ad.seats:
        if ad.is_passenger:
            lines += ["", "👥 <b>Yo'lovchilar</b>", f"{ad.seats} nafar"]
        else:
            lines += ["", "👥 <b>Bo'sh joy</b>", f"{ad.seats} nafar yo'lovchi"]
    if ad.car:
        lines += ["", "🚗 <b>Mashina</b>", html.escape(ad.car)]
    if ad.takes_cargo and not ad.is_passenger:
        lines += ["", "📦 <b>Pochta</b>", "Olinadi"]
    if ad.phones:
        lines += ["", f"📞 <b>{who} telefoni</b>", "\n".join(format_phone(p) for p in ad.phones)]
    lines += [
        "➖➖➖➖➖➖➖➖➖➖",
        f"E'lon egasi: <a href=\"{_profile_url(author)}\">{html.escape(author_name)}</a>",
    ]
    return "\n".join(lines)


def card_keyboard(ad: ParsedAd, author: User, *, with_chat_button: bool = True) -> InlineKeyboardMarkup | None:
    """"Write" opens the author's Telegram chat; "call" goes through the website's /call.html
    redirect (Telegram buttons can't hold tel: links). On a non-https WEBAPP_URL (local dev)
    the call button copies the number instead — Telegram rejects localhost button URLs."""
    whom = "Yo'lovchiga" if ad.is_passenger else "Haydovchiga"
    builder = InlineKeyboardBuilder()
    if with_chat_button:
        builder.button(text=f"💬 {whom} yozish", url=_profile_url(author))
    if ad.phones:
        phone = ad.phones[0]
        base = settings.webapp_url.rstrip("/")
        if base.startswith("https://"):
            builder.button(text=f"📞 {whom} tel qilish", url=f"{base}/call.html?n={quote(phone)}")
        else:
            builder.button(text=f"📞 {format_phone(phone)}", copy_text=CopyTextButton(text=phone))
    builder.adjust(1)
    markup = builder.as_markup()
    return markup if markup.inline_keyboard else None
