import re

_DIGITS_RE = re.compile(r"\D+")


def normalize_phone(raw: str) -> str | None:
    """Accepts +998901234567, 998901234567, 901234567, or the same with spaces/()/./- mixed
    in (e.g. "+998 (90) 123-45-67"). Returns a canonical "+998XXXXXXXXX" string, or None if the
    input doesn't contain a plausible Uzbek mobile number."""
    digits = _DIGITS_RE.sub("", raw)
    if not digits:
        return None

    if digits.startswith("998"):
        digits = digits[3:]
    digits = digits.lstrip("0")

    if len(digits) != 9:
        return None

    return f"+998{digits}"


def format_phone(phone: str) -> str:
    """+998901234567 -> +998 90 123 45 67, for display only."""
    digits = _DIGITS_RE.sub("", phone)
    if digits.startswith("998"):
        digits = digits[3:]
    if len(digits) != 9:
        return phone
    return f"+998 {digits[0:2]} {digits[2:5]} {digits[5:7]} {digits[7:9]}"
