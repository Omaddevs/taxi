"""Runtime bot settings — the "Bot sozlamalari" the admin dashboard (and the bot's own admin
panel) can change without a redeploy. Every field has a default here (the older ones fall back
to their .env value from app/config.py); the `bot_settings` table stores only overrides.

Reads are synchronous from an in-memory cache: the bot is a single process, and every write
goes through `update()` (from the bot's webserver or admin handlers), which refreshes the cache
in the same process — so `get()` never needs a DB round-trip and can be called anywhere.
"""

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import BotSetting


@dataclass(frozen=True)
class Field:
    key: str
    section: str
    label: str
    type: str  # int | bool | url | text | longtext
    default: Any
    help: str = ""
    min: int | None = None
    max: int | None = None


SECTIONS: list[tuple[str, str, str]] = [
    ("features", "Funksiyalar", "Bot funksiyalarini barcha guruhlarda birdaniga yoqish yoki o'chirish"),
    ("general", "Umumiy", "Admin bilan bog'lanish va umumiy parametrlar"),
    ("drivers", "Haydovchilar va obuna", "Obuna muddati, eslatmalar, buyurtma band qilish vaqti"),
    ("clients", "Mijozlar", "Bot ichidagi mijoz oqimi"),
    ("format_ads", "E'lon shabloni", "E'lon matni o'zgarmaydi — bot tepasiga TaxiLine sarlavhasi, pastiga e'lon egasi va tugmalarni qo'yadi"),
    ("group_ads", "Guruh e'lonlari", "Ochiq guruhdagi xabarlar: yo'lovchi/haydovchi so'rovi va matnlar"),
]

FIELDS: list[Field] = [
    # Master switches. A group-level toggle (Guruhlar page) only matters while its feature is on here.
    Field("features.group_ads", "features", "Yo'lovchi/haydovchi so'rovi", "bool", True,
          "O'chirilsa, barcha guruhlarda xabarlar ushlanmaydi (guruh sozlamasi yoqilgan bo'lsa ham)"),
    Field("features.format_ads", "features", "E'lonlarni yagona shablonga solish", "bool", True,
          "O'chirilsa, hech bir guruhda e'lonlar kartochkaga aylantirilmaydi"),
    Field("features.take_button", "features", "«✅ Men olaman» tugmasi", "bool", True,
          "Yopiq guruhdagi yo'lovchi kartochkasida haydovchi e'lonni band qila oladi"),
    Field("features.notify_passenger", "features", "Haydovchi olganda yo'lovchiga xabar", "bool", True,
          "Yo'lovchi botni ochgan bo'lsa, unga shaxsiy xabar yuboriladi"),
    Field("features.auto_cleanup", "features", "Bot xabarlarini guruhdan avtomatik o'chirish", "bool", True,
          "So'rov va javob xabarlari belgilangan vaqtdan keyin o'chadi"),
    Field("admin_contact_url", "general", "Admin havolasi", "url", settings.admin_contact_url,
          "«Adminga yozish» tugmalari shu manzilni ochadi, masalan https://t.me/taxiline_toshkent"),
    Field("driver_subscription_days", "drivers", "Obuna muddati (kun)", "int", settings.driver_subscription_days,
          "Haydovchi tasdiqlangandan keyin obuna necha kun amal qiladi", 1, 366),
    Field("subscription_reminder_days", "drivers", "Obuna tugashidan oldin eslatish (kun)", "int",
          settings.subscription_reminder_days, "", 1, 30),
    Field("claim_timeout_minutes", "drivers", "Band qilingan buyurtmani tasdiqlash vaqti (daqiqa)", "int",
          settings.claim_timeout_minutes, "Shu vaqt ichida tasdiqlanmasa, buyurtma qayta ochiladi", 1, 240),
    Field("driver_no_show_alert_threshold", "drivers", "Kelmaslik ogohlantirish chegarasi", "int",
          settings.driver_no_show_alert_threshold, "Haydovchi shuncha marta kelmasa, adminlarga xabar boradi", 1, 50),
    Field("inactivity_nudge_seconds", "clients", "Javobsiz qolgan mijozga eslatma (soniya)", "int",
          settings.inactivity_nudge_seconds, "Buyurtma berishni yarim yo'lda tashlagan mijozga shuncha vaqtdan keyin eslatiladi",
          15, 3600),
    Field("format_ads.driver_subtitle", "format_ads", "Haydovchi e'loni sarlavhasi", "text", "Yo'lovchi tashish e'loni"),
    Field("format_ads.passenger_subtitle", "format_ads", "Yo'lovchi e'loni sarlavhasi", "text",
          "Yo'lovchi e'loni — mashina qidirilmoqda", "Matnda «mashina kerak», «ketamiz» kabi so'zlar bo'lsa"),
    Field("format_ads.fresh_minutes", "format_ads", "«🟢 Faol» turadigan vaqt (daqiqa)", "int", 30,
          "Keyin «🟡 30 daqiqa oldin», «🟡 1 soat oldin»… — belgi shu qadam bilan yangilanadi", 5, 720),
    Field("format_ads.stale_minutes", "format_ads", "«🔴 Eskirgan» bo'ladigan vaqt (daqiqa)", "int", 120,
          "Shundan keyin e'lon boshqa tahrirlanmaydi", 10, 2880),
    Field("group_ads.ask_text", "group_ads", "So'rov matni", "longtext",
          "👋 {name}, xabaringizni to'g'ri joyga yetkazishimiz uchun tanlang:\n\nSiz yo'lovchimisiz yoki haydovchi?",
          "{name} — yozgan odamning ismi (bosiladigan havola)"),
    Field("group_ads.passenger_text", "group_ads", "Yo'lovchiga javob", "longtext",
          "✅ {name}, ma'lumotlaringiz haydovchilar yopiq guruhiga yuborildi. Tez orada siz bilan aloqaga chiqishadi.\n\n"
          "Ma'lumotlaringizni o'zgartirmoqchi yoki qaytadan yubormoqchi bo'lsangiz, «Yuborish» tugmasini bosing.",
          "{name} — yo'lovchining ismi"),
    Field("group_ads.driver_text", "group_ads", "Haydovchiga javob", "longtext",
          "🚖 {name}, haydovchilar yopiq guruhiga qo'shilish hamda ushbu guruhga yozib mijozlarni olishni "
          "xohlasangiz, adminga murojaat qiling.",
          "{name} — haydovchining ismi. Tugma «Admin havolasi»ni ochadi"),
    Field("group_ads.prompt_ttl_minutes", "group_ads", "So'rovga javob kutish (daqiqa)", "int", 3,
          "Javob bosilmasa, so'rov guruhdan o'chiriladi", 1, 60),
    Field("group_ads.notice_ttl_minutes", "group_ads", "Javob xabarini guruhda saqlash (daqiqa)", "int", 10,
          "Guruh toza turishi uchun bot javobi shuncha vaqtdan keyin o'chadi", 1, 1440),
    Field("group_ads.role_memory_hours", "group_ads", "Tanlovni eslab qolish (soat)", "int", 24,
          "Shu vaqt ichida qayta yozsa, qayta so'ralmaydi. 0 — har safar so'raladi", 0, 720),
    Field("group_ads.driver_notice_cooldown_minutes", "group_ads", "Haydovchiga qayta eslatish oralig'i (daqiqa)", "int", 10,
          "Eslab qolingan haydovchi tez-tez yozsa, xabari jim o'chiriladi va javob shu oraliqda bir marta chiqadi", 1, 1440),
    Field("group_ads.allow_subscribed_drivers", "group_ads", "Obunasi faol haydovchilar erkin yozadi", "bool", True,
          "Tasdiqlangan va obunasi faol haydovchilarning xabarlari o'chirilmaydi"),
]

_BY_KEY = {f.key: f for f in FIELDS}
_cache: dict[str, Any] = {}


def get(key: str) -> Any:
    if key in _cache:
        return _cache[key]
    return _BY_KEY[key].default


async def load(session: AsyncSession) -> None:
    result = await session.execute(select(BotSetting))
    _cache.clear()
    for row in result.scalars():
        if row.key in _BY_KEY:
            _cache[row.key] = (row.value or {}).get("v")


def _coerce(field: Field, raw: Any) -> Any:
    if field.type == "bool":
        if isinstance(raw, bool):
            return raw
        raise ValueError(f"«{field.label}»: ha/yo'q bo'lishi kerak")
    if field.type == "int":
        try:
            value = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"«{field.label}»: butun son kiriting") from exc
        if field.min is not None and value < field.min or field.max is not None and value > field.max:
            raise ValueError(f"«{field.label}»: {field.min}–{field.max} oralig'ida bo'lishi kerak")
        return value
    value = str(raw or "").strip()
    if not value:
        raise ValueError(f"«{field.label}» bo'sh bo'lmasin")
    if field.type == "url" and not (value.startswith("https://") or value.startswith("tg://")):
        raise ValueError(f"«{field.label}»: https:// bilan boshlanadigan havola kiriting")
    if len(value) > (1500 if field.type == "longtext" else 300):
        raise ValueError(f"«{field.label}» juda uzun")
    return value


async def update(session: AsyncSession, patch: dict[str, Any]) -> None:
    """Validates the whole patch first (ValueError names the bad field), then upserts. A value
    equal to the default removes the override, so later default changes still apply."""
    cleaned: dict[str, Any] = {}
    for key, raw in patch.items():
        field = _BY_KEY.get(key)
        if field is None:
            raise ValueError(f"Noma'lum sozlama: {key}")
        cleaned[key] = _coerce(field, raw)

    for key, value in cleaned.items():
        row = await session.get(BotSetting, key)
        if value == _BY_KEY[key].default:
            if row is not None:
                await session.delete(row)
            _cache.pop(key, None)
            continue
        if row is None:
            session.add(BotSetting(key=key, value={"v": value}))
        else:
            row.value = {"v": value}
        _cache[key] = value
    await session.commit()


def describe() -> dict:
    return {
        "sections": [
            {
                "key": key,
                "label": label,
                "description": description,
                "fields": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "type": f.type,
                        "help": f.help,
                        "min": f.min,
                        "max": f.max,
                        "default": f.default,
                        "value": get(f.key),
                    }
                    for f in FIELDS
                    if f.section == key
                ],
            }
            for key, label, description in SECTIONS
        ]
    }
