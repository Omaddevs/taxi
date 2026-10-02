from datetime import timezone
from html import escape

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.admin import ADMIN_STATS_BTN
from app.services import stats as stats_service
from app.services.stats import PERIOD_LABELS, PERIODS, TASHKENT, Stats

router = Router(name="admin_stats")

SOURCE_LABELS = {"BOT": "bot", "WEBAPP": "webapp", "GROUP": "guruh"}
GROUP_KIND_LABELS = {
    "CLOSED": "yopiq",
    "ROUTE": "yo'nalish",
    "MAIN": "asosiy",
    "CHANNEL": "kanal",
    "MANDATORY_SUB_TARGET": "majburiy obuna",
}
PERIOD_TITLES = {"today": "bugun", "week": "so'nggi 7 kun", "month": "so'nggi 30 kun", "all": "butun davr"}


def _stats_kb(period: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for p in PERIODS:
        label = PERIOD_LABELS[p]
        builder.button(text=f"• {label} •" if p == period else label, callback_data=f"adminstats:{p}")
    builder.button(text="🔄 Yangilash", callback_data=f"adminstats:{period}")
    builder.adjust(4, 1)
    return builder.as_markup()


def _pct(part: int, whole: int) -> str:
    return f"{part / whole * 100:.0f}%" if whole else "—"


def _short_region(name: str) -> str:
    return escape(name.replace(" viloyati", "").replace(" Respublikasi", ""))


def _duration(minutes: float) -> str:
    if minutes < 1:
        return "1 daqiqadan kam"
    if minutes < 60:
        return f"{minutes:.0f} daqiqa"
    hours, mins = divmod(round(minutes), 60)
    return f"{hours} soat {mins} daqiqa"


def render(s: Stats) -> str:
    title = PERIOD_TITLES[s.period]
    updated = s.generated_at.replace(tzinfo=timezone.utc).astimezone(TASHKENT).strftime("%d.%m.%Y %H:%M")
    lines = [f"📊 <b>Statistika</b> — {title}", f"<i>🕒 {updated} (Toshkent vaqti)</i>", ""]

    lines += [
        "👥 <b>Foydalanuvchilar</b>",
        f"• Jami: <b>{s.users_total}</b> (mijoz: {s.clients}, haydovchi: {s.drivers_role})",
    ]
    if s.period != "all":
        lines.append(f"• Yangi ro'yxatdan o'tgan: <b>{s.users_new}</b>")
    lines += [
        f"• Faol{'' if s.period != 'all' else ' (so‘nggi 30 kun)'}: <b>{s.users_active}</b>"
        f" ({_pct(s.users_active, s.users_total)})",
        f"• Adminlar: {s.admins} · Bloklangan: {s.users_blocked} · Chiqib ketgan: {s.users_logged_out}",
        "",
    ]

    lines += [
        "🚗 <b>Haydovchilar</b>",
        f"• Jami arizalar: <b>{s.drivers_total}</b>" + (f" (yangi: {s.drivers_new})" if s.period != "all" else ""),
        f"• ✅ Tasdiqlangan: {s.drivers_approved} · ⏳ Kutilmoqda: {s.drivers_pending} · ❌ Rad etilgan: {s.drivers_rejected}",
    ]
    if s.drivers_not_joined:
        lines.append(f"• Tasdiqlangan, guruhga qo'shilmagan: {s.drivers_not_joined}")
    lines += [
        f"• 🔒 Bloklangan: {s.drivers_blocked} · 🚫 Kelmay qolishlar (jami): {s.no_shows}",
        f"• 💳 Obuna: faol <b>{s.subs_active}</b> · {stats_service.EXPIRING_SOON_DAYS} kunda tugaydi:"
        f" {s.subs_expiring} · tugagan: {s.subs_inactive}",
        "",
    ]

    sources = ", ".join(
        f"{SOURCE_LABELS.get(src, src.lower())}: {n}"
        for src, n in sorted(s.orders_by_source.items(), key=lambda item: -item[1])
    )
    lines += [
        "🚕 <b>Buyurtmalar</b>",
        f"• Yangi: <b>{s.orders_created}</b>" + (f" ({sources})" if sources else ""),
        f"• Yo'lovchilar (yangi buyurtmalarda): {s.orders_passengers}",
        f"• ✅ Yakunlangan safarlar: <b>{s.completed}</b> ({s.completed_passengers} yo'lovchi)",
        f"• 🔒 Yopilgan: {s.closed} · ❌ Bekor qilingan: {s.cancelled}",
    ]
    if s.success_rate is not None:
        lines.append(f"• 🎯 Muvaffaqiyat: <b>{s.success_rate:.0f}%</b> (yakunlangan / jami tugagan)")
    if s.avg_claim_minutes is not None:
        lines.append(f"• ⏱ Haydovchi o'rtacha qabul qilish vaqti: {_duration(s.avg_claim_minutes)}")
    if s.top_routes:
        lines.append("• 🔝 Eng ko'p yo'nalishlar:")
        for i, (from_region, to_region, n) in enumerate(s.top_routes, 1):
            lines.append(f"   {i}. {_short_region(from_region)} → {_short_region(to_region)} — {n}")
    lines.append("")

    lines += [
        "📌 <b>Hozirgi holat</b>",
        f"• 🟢 Ochiq buyurtmalar: <b>{s.open_now}</b>",
        f"• 🙋 Qabul qilingan, yo'lga chiqilmagan: {s.waiting_driver_now}",
        f"• 🚗 Yo'lda: {s.enroute_now}",
        f"• ⚠️ Shikoyatlar: yangi {s.complaints_open}, ko'rib chiqilmoqda {s.complaints_in_progress}"
        f" (davrda kelgan: {s.complaints_new})",
        f"• 💬 Ochiq murojaatlar: {s.tickets_open} (davrda kelgan: {s.tickets_new})",
    ]
    if s.groups_by_kind:
        groups = ", ".join(f"{GROUP_KIND_LABELS.get(k, k.lower())}: {n}" for k, n in sorted(s.groups_by_kind.items()))
        lines.append(f"• 👥 Guruhlar: {sum(s.groups_by_kind.values())} ({groups})")

    return "\n".join(lines)


@router.message(F.text == ADMIN_STATS_BTN)
async def show_stats(message: Message, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    s = await stats_service.collect(session, "today")
    await message.answer(render(s), parse_mode="HTML", reply_markup=_stats_kb(s.period))


@router.callback_query(F.data.startswith("adminstats:"))
async def switch_period(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    s = await stats_service.collect(session, callback.data.split(":", 1)[1])
    try:
        await callback.message.edit_text(render(s), parse_mode="HTML", reply_markup=_stats_kb(s.period))
    except TelegramBadRequest as exc:
        # "Yangilash" within the same minute with no new data renders identical text.
        if "message is not modified" not in str(exc):
            raise
    await callback.answer("Yangilandi ✅")
