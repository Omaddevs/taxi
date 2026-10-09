from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, ChatMemberUpdated, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.data.regions import REGION_NAMES
from app.db.models import Group
from app.keyboards.admin import ADMIN_GROUPS_BTN
from app.services import groups as groups_service
from app.services import users as users_service
from app.states.admin_broadcast import AdminGroupSetup, AdminMandatorySub

router = Router(name="admin_groups")

SETTING_LABELS = {
    "anti_spam": "🧹 Anti-spam (link/mention o'chirish)",
    "delete_join_leave": "🚪 Kirish/chiqish xabarlarini o'chirish",
    "rate_limit_enabled": "⏱ 1 daqiqada 1 xabar limiti",
    "restrict_non_admin_posts": "🔒 Faqat adminlar yoza oladi",
    "require_invites": "➕ Yozish uchun kamida 2 kishi taklif qilish talabi",
    "format_ads": "🧾 E'lonlarni yagona shablonga solish",
}


def _root_menu_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="➕ Yangi guruh qo'shish", callback_data="admingroup:new")
    builder.button(text="📋 Guruhlar ro'yxati", callback_data="admingroup:list")
    builder.button(text="🔒 Majburiy obuna", callback_data="admingroup:mandatory")
    builder.adjust(1)
    return builder.as_markup()


def _kind_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="🔒 Yopiq — haydovchilar guruhi (buyurtmalar shu yerga boradi)", callback_data="admingroupkind:CLOSED")
    builder.button(text="🛣 Yo'nalish guruhi (har yo'nalish — alohida topic)", callback_data="admingroupkind:ROUTE")
    builder.button(text="📢 Ochiq/umumiy guruh (reklama, e'lon uchun)", callback_data="admingroupkind:MAIN")
    builder.adjust(1)
    return builder.as_markup()


def _region_kb():
    builder = InlineKeyboardBuilder()
    builder.button(text="🌐 Barcha viloyatlar (umumiy guruh)", callback_data="admingroupregion:all")
    for i, region in enumerate(REGION_NAMES):
        builder.button(text=region, callback_data=f"admingroupregion:{i}")
    builder.adjust(1)
    return builder.as_markup()


def _route_region_kb(prefix: str):
    builder = InlineKeyboardBuilder()
    for i, region in enumerate(REGION_NAMES):
        builder.button(text=region, callback_data=f"{prefix}:{i}")
    builder.adjust(1)
    return builder.as_markup()


def _routes_kb(group):
    builder = InlineKeyboardBuilder()
    for i, route in enumerate(group.routes or []):
        thread = route.get("message_thread_id")
        topic_part = f" (topic {thread})" if thread else ""
        builder.button(
            text=f"❌ {route['from_region']} → {route['to_region']}{topic_part}",
            callback_data=f"adminroutedel:{group.id}:{i}",
        )
    builder.button(text="➕ Yo'nalish qo'shish", callback_data=f"adminrouteadd:{group.id}")
    builder.button(text="✏️ Turini o'zgartirish", callback_data=f"admingroupedit:{group.id}")
    builder.button(text="🗑 Guruhni o'chirish", callback_data=f"admingroupdelete:{group.id}")
    builder.adjust(1)
    return builder.as_markup()


def _settings_kb(group):
    builder = InlineKeyboardBuilder()
    for key, label in SETTING_LABELS.items():
        state_icon = "✅" if group.settings.get(key) else "⬜️"
        builder.button(text=f"{state_icon} {label}", callback_data=f"admingroupsetting:{group.id}:{key}")
    builder.button(text="✏️ Turi/viloyatni o'zgartirish", callback_data=f"admingroupedit:{group.id}")
    builder.button(text="🗑 O'chirish", callback_data=f"admingroupdelete:{group.id}")
    builder.adjust(1)
    return builder.as_markup()


def _group_text(group) -> str:
    if group.kind == "ROUTE":
        lines = [f"📋 {group.title or group.chat_id}\nTuri: Yo'nalish (topic) guruhi"]
        if group.routes:
            for route in group.routes:
                thread = route.get("message_thread_id")
                topic_part = f" · topic {thread}" if thread else " · topic yo'q (asosiy chatga)"
                lines.append(f"• {route['from_region']} → {route['to_region']}{topic_part}")
        else:
            lines.append("Hali yo'nalish qo'shilmagan.")
        return "\n".join(lines)
    return f"📋 {group.title or group.chat_id}\nTuri: {group.kind} · Viloyat: {group.region or '-'}"


@router.message(F.text == ADMIN_GROUPS_BTN)
async def groups_menu(message: Message, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    await message.answer("👥 Guruhlar boshqaruvi:", reply_markup=_root_menu_kb())


@router.callback_query(F.data == "admingroup:new")
async def new_group_prompt(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return
    await callback.answer()
    await callback.message.answer(
        "Botni kerakli guruhga admin sifatida qo'shing (xabarlarni o'chirish va a'zolarni boshqarish "
        "huquqlari bilan). Guruh admini bo'lgach, bot o'sha guruhga chat ID'sini yozadi — "
        "o'sha ID'ni shu yerga yuboring:"
    )
    await state.set_state(AdminGroupSetup.entering_chat_id)


@router.message(AdminGroupSetup.entering_chat_id, F.text)
async def receive_chat_id(message: Message, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return
    try:
        chat_id = int(message.text.strip())
    except ValueError:
        await message.answer("Chat ID raqam bo'lishi kerak, masalan: -1001234567890")
        return

    try:
        chat = await message.bot.get_chat(chat_id)
    except TelegramAPIError:
        await message.answer("Bu chatni topib bo'lmadi. Bot o'sha guruhga admin qilib qo'shilganiga ishonch hosil qiling.")
        return

    await state.update_data(chat_id=chat.id, title=chat.title or str(chat.id))
    await message.answer("Guruh turini tanlang:", reply_markup=_kind_kb())
    await state.set_state(AdminGroupSetup.choosing_kind)


@router.callback_query(AdminGroupSetup.choosing_kind, F.data.startswith("admingroupkind:"))
async def choose_kind(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    kind = callback.data.split(":")[-1]
    await state.update_data(kind=kind)
    await callback.answer()

    if kind == "CLOSED":
        await callback.message.edit_text("Bu guruh qaysi viloyat uchun?", reply_markup=_region_kb())
        await state.set_state(AdminGroupSetup.choosing_region)
        return

    if kind == "ROUTE":
        data = await state.get_data()
        # register_group upserts by chat_id and never touches `routes`, so re-picking ROUTE on
        # an already-registered route group keeps its existing routes intact.
        group = await groups_service.register_group(
            session,
            chat_id=data["chat_id"],
            title=data["title"],
            kind="ROUTE",
            region=None,
            added_by_telegram_id=bot_user.telegram_id,
        )
        await state.clear()
        await callback.message.edit_text(_group_text(group), reply_markup=_routes_kb(group))
        return

    data = await state.get_data()
    group = await groups_service.register_group(
        session,
        chat_id=data["chat_id"],
        title=data["title"],
        kind="MAIN",
        region=None,
        added_by_telegram_id=bot_user.telegram_id,
    )
    await state.clear()
    await callback.message.edit_text(_group_text(group), reply_markup=_settings_kb(group))


@router.callback_query(AdminGroupSetup.choosing_region, F.data.startswith("admingroupregion:"))
async def choose_region(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    suffix = callback.data.split(":")[-1]
    region = None if suffix == "all" else REGION_NAMES[int(suffix)]
    data = await state.get_data()

    group = await groups_service.register_group(
        session,
        chat_id=data["chat_id"],
        title=data["title"],
        kind="CLOSED",
        region=region,
        added_by_telegram_id=bot_user.telegram_id,
    )
    await state.clear()
    await callback.answer()
    await callback.message.edit_text(_group_text(group), reply_markup=_settings_kb(group))


@router.callback_query(F.data == "admingroup:list")
async def list_groups(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    main_groups = await groups_service.list_by_kind(session, "MAIN")
    closed_groups = await groups_service.list_by_kind(session, "CLOSED")
    route_groups = await groups_service.list_by_kind(session, "ROUTE")
    await callback.answer()

    groups = main_groups + closed_groups + route_groups
    if not groups:
        await callback.message.answer("Hozircha ro'yxatga olingan guruhlar yo'q.")
        return

    for group in groups:
        kb = _routes_kb(group) if group.kind == "ROUTE" else _settings_kb(group)
        await callback.message.answer(_group_text(group), reply_markup=kb)


@router.callback_query(F.data.startswith("admingroupedit:"))
async def edit_group_kind(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    group_id = int(callback.data.split(":")[-1])
    group = await session.get(Group, group_id)
    if group is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    # register_group upserts by chat_id, so re-running the same kind/region picker on an
    # already-registered group updates it in place instead of creating a duplicate — this is
    # the self-service fix for a group that was set up with the wrong kind/region (exactly
    # what happened with the very first live group).
    await state.update_data(chat_id=group.chat_id, title=group.title)
    await callback.answer()
    await callback.message.answer("Guruh turini tanlang:", reply_markup=_kind_kb())
    await state.set_state(AdminGroupSetup.choosing_kind)


@router.callback_query(F.data.startswith("adminrouteadd:"))
async def route_add_prompt(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    group_id = int(callback.data.split(":")[-1])
    group = await session.get(Group, group_id)
    if group is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await state.update_data(group_id=group.id)
    await callback.answer()
    await callback.message.answer("Yo'nalish qayerdan boshlanadi?", reply_markup=_route_region_kb("adminroutefrom"))
    await state.set_state(AdminGroupSetup.choosing_route_from)


@router.callback_query(AdminGroupSetup.choosing_route_from, F.data.startswith("adminroutefrom:"))
async def route_choose_from(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    region = REGION_NAMES[int(callback.data.split(":")[-1])]
    await state.update_data(from_region=region)
    await callback.answer()
    await callback.message.edit_text("Yo'nalish qayerga tugaydi?", reply_markup=_route_region_kb("adminrouteto"))
    await state.set_state(AdminGroupSetup.choosing_route_to)


@router.callback_query(AdminGroupSetup.choosing_route_to, F.data.startswith("adminrouteto:"))
async def route_choose_to(callback: CallbackQuery, state: FSMContext, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    region = REGION_NAMES[int(callback.data.split(":")[-1])]
    await state.update_data(to_region=region)
    await callback.answer()
    await callback.message.edit_text(
        "Bu yo'nalish alohida topic (mavzu)ga joylansinmi?\n\n"
        "Guruh topic havolasi oxiridagi raqamni yuboring — masalan "
        "https://t.me/guruh_nomi/3 uchun \"3\" deb yozing.\n"
        "Agar topic kerak bo'lmasa (oddiy guruh chatiga), \"yo'q\" deb yozing."
    )
    await state.set_state(AdminGroupSetup.entering_route_thread_id)


@router.message(AdminGroupSetup.entering_route_thread_id, F.text)
async def route_enter_thread(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    text = message.text.strip().lower()
    thread_id = None
    if text not in ("yo'q", "yoq", "-", "0"):
        try:
            thread_id = int(text)
        except ValueError:
            await message.answer("Raqam yuboring (masalan 3) yoki topic kerak bo'lmasa \"yo'q\" deb yozing.")
            return

    data = await state.get_data()
    group = await session.get(Group, data["group_id"])
    if group is None:
        await state.clear()
        await message.answer("Bu guruh o'chirilgan ko'rinadi, qaytadan urinib ko'ring.")
        return

    group = await groups_service.add_route(
        session,
        group,
        from_region=data["from_region"],
        to_region=data["to_region"],
        message_thread_id=thread_id,
    )
    await state.clear()
    await message.answer(f"✅ Yo'nalish qo'shildi.\n\n{_group_text(group)}", reply_markup=_routes_kb(group))


@router.callback_query(F.data.startswith("adminroutedel:"))
async def route_delete(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, group_id, index = callback.data.split(":")
    group = await session.get(Group, int(group_id))
    if group is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    group = await groups_service.remove_route(session, group, int(index))
    await callback.answer("O'chirildi ✅")
    await callback.message.edit_text(_group_text(group), reply_markup=_routes_kb(group))


@router.callback_query(F.data.startswith("admingroupsetting:"))
async def toggle_setting(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    _, group_id, key = callback.data.split(":")
    group = await session.get(Group, int(group_id))
    if group is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    new_value = not group.settings.get(key, False)
    await groups_service.update_settings(session, group, **{key: new_value})
    await callback.answer("Yangilandi ✅")
    await callback.message.edit_reply_markup(reply_markup=_settings_kb(group))


@router.callback_query(F.data.startswith("admingroupdelete:"))
async def delete_group(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    group_id = int(callback.data.split(":")[-1])
    group = await session.get(Group, group_id)
    if group is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await groups_service.remove_group(session, group)
    await callback.answer("O'chirildi ✅")
    await callback.message.edit_text("🗑 Guruh ro'yxatdan o'chirildi.")


@router.callback_query(F.data == "admingroup:mandatory")
async def mandatory_menu(callback: CallbackQuery, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    targets = await groups_service.list_mandatory_targets(session)
    await callback.answer()

    if not targets:
        await callback.message.answer("Majburiy obuna nishonlari hozircha yo'q.")
    for target in targets:
        builder = InlineKeyboardBuilder()
        builder.button(text="🗑 O'chirish", callback_data=f"adminmandatorydel:{target.id}")
        await callback.message.answer(f"🔒 {target.title}", reply_markup=builder.as_markup())

    await callback.message.answer(
        "Yangi nishon qo'shish uchun kanal/guruhning @username'ini yoki chat ID'sini yuboring "
        "(bot o'sha kanal/guruhda a'zo yoki admin bo'lishi kerak):"
    )
    await state.set_state(AdminMandatorySub.entering_target)


@router.message(AdminMandatorySub.entering_target, F.text)
async def add_mandatory_target(message: Message, state: FSMContext, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        return

    ref = message.text.strip()
    if ref.startswith("https://t.me/"):
        ref = "@" + ref.removeprefix("https://t.me/").split("/")[0]

    try:
        chat = await message.bot.get_chat(ref)
    except TelegramAPIError:
        await message.answer("Bu kanal/guruhni topib bo'lmadi.")
        return

    invite_link = f"https://t.me/{chat.username}" if chat.username else None
    if invite_link is None:
        try:
            invite_link = await message.bot.export_chat_invite_link(chat.id)
        except TelegramAPIError:
            invite_link = None

    await groups_service.add_mandatory_target(
        session, chat_id=chat.id, title=chat.title or ref, invite_link=invite_link
    )
    await state.clear()
    await message.answer("✅ Qo'shildi.")


@router.callback_query(F.data.startswith("adminmandatorydel:"))
async def remove_mandatory_target(callback: CallbackQuery, session, bot_user) -> None:
    if bot_user is None or not bot_user.is_admin:
        await callback.answer()
        return

    target_id = int(callback.data.split(":")[-1])
    target = await session.get(Group, target_id)
    if target is None:
        await callback.answer("Topilmadi", show_alert=True)
        return

    await groups_service.remove_group(session, target)
    await callback.answer("O'chirildi ✅")
    await callback.message.edit_text("🗑 O'chirildi.")


@router.my_chat_member()
async def bot_added_to_group(update: ChatMemberUpdated, session) -> None:
    if update.chat.type not in ("group", "supergroup"):
        return
    if update.new_chat_member.status != "administrator":
        return

    try:
        await update.bot.send_message(
            update.chat.id,
            f"✅ Bot ushbu guruhga admin sifatida qo'shildi.\n\nRo'yxatga olish uchun ushbu ID'ni "
            f"botga shaxsiy xabarda yuboring:\n`{update.chat.id}`",
            parse_mode="Markdown",
        )
    except TelegramAPIError:
        pass

    actor = await users_service.get_by_telegram_id(session, update.from_user.id)
    if actor and actor.is_admin:
        try:
            await update.bot.send_message(
                actor.telegram_id,
                f"Guruh ID: `{update.chat.id}` ({update.chat.title}).\n"
                f"Ro'yxatga olish uchun Admin panel → Guruhlar → Yangi guruh qo'shish bo'limida shu ID'ni yuboring.",
                parse_mode="Markdown",
            )
        except TelegramAPIError:
            pass
