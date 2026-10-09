import re
import time
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import Group, GroupInviteJoin, GroupInviteLink

DEFAULT_SETTINGS = {
    "anti_spam": False,
    "delete_join_leave": False,
    "rate_limit_enabled": False,
    "restrict_non_admin_posts": False,
    "require_invites": False,
    "format_ads": False,
    "ad_router": False,
    # Group.id of the closed driver group that receives this open group's passenger ads.
    "linked_group_id": None,
}

# Number of real, still-present invited members a non-admin must bring into a
# `require_invites`-gated group before they're allowed to post there.
REQUIRED_INVITES = 2

# chat_id -> {user_id: last_post_ts}. In-memory is fine — a process restart resetting the
# 1-msg/min window is a harmless edge case, not worth a DB round-trip on every group message.
_rate_limit_state: dict[int, dict[int, float]] = {}


async def get_by_chat_id(session: AsyncSession, chat_id: int) -> Group | None:
    result = await session.execute(select(Group).where(Group.chat_id == chat_id))
    return result.scalar_one_or_none()


async def list_by_kind(session: AsyncSession, kind: str) -> list[Group]:
    result = await session.execute(select(Group).where(Group.kind == kind))
    return list(result.scalars())


async def list_driver_groups(session: AsyncSession) -> list[Group]:
    return await list_by_kind(session, "CLOSED")


def short_region(name: str) -> str:
    key = (name or "").strip()
    for suffix in (" Respublikasi", " viloyati", " shahri"):
        if key.endswith(suffix):
            return key[: -len(suffix)].strip()
    return key


def corridor_title(from_region: str, to_region: str) -> str:
    return f"{short_region(from_region)}-{short_region(to_region)}"


def parse_telegram_ref(raw: str) -> dict:
    """Accept a chat id, @username, t.me link, or t.me/c/<id>/<topic> private-forum link."""
    text = (raw or "").strip()
    if not text:
        raise ValueError("empty ref")

    if text.startswith("t.me/") or text.startswith("telegram.me/"):
        text = "https://" + text
    text = text.replace("https://telegram.me/", "https://t.me/")
    text = text.replace("http://t.me/", "https://t.me/")
    text = text.split("?")[0].rstrip("/")

    if re.fullmatch(r"-?\d+", text):
        return {"chat_id": int(text)}

    if text.startswith("@"):
        return {"username": text}

    if re.match(r"^https://t\.me/\+", text) or re.match(r"^https://t\.me/joinchat/", text):
        return {"invite": text}

    private = re.match(r"^https://t\.me/c/(\d+)(?:/(\d+))?", text)
    if private:
        payload: dict = {"chat_id": int(f"-100{private.group(1)}")}
        if private.group(2):
            payload["thread_id"] = int(private.group(2))
        return payload

    public = re.match(r"^https://t\.me/([A-Za-z0-9_]+)(?:/(\d+))?", text)
    if public:
        payload = {"username": f"@{public.group(1)}"}
        if public.group(2):
            payload["thread_id"] = int(public.group(2))
        return payload

    if re.fullmatch(r"[A-Za-z0-9_]{4,32}", text):
        return {"username": f"@{text}"}

    raise ValueError("invalid ref")


def serialize_route(route: dict) -> dict:
    return {
        "fromRegion": route.get("from_region"),
        "toRegion": route.get("to_region"),
        "threadId": route.get("message_thread_id"),
        "label": route.get("label"),
    }


def serialize_group(group: Group) -> dict:
    settings = group.settings or {}
    created = group.created_at.isoformat() if group.created_at else None
    routes = [serialize_route(r) for r in (group.routes or [])]
    return {
        "id": group.id,
        "chatId": str(group.chat_id),
        "title": group.title,
        "kind": group.kind,
        "region": group.region,
        "language": group.language,
        "username": settings.get("username"),
        "inviteLink": settings.get("invite_link"),
        "routes": routes,
        "createdAt": created,
        # On/off group services (anti-spam, ad_router, …) and the closed group an open group's
        # passenger ads are routed to.
        "settings": {key: bool(settings.get(key)) for key, default in DEFAULT_SETTINGS.items() if isinstance(default, bool)},
        "linkedGroupId": settings.get("linked_group_id"),
    }


def build_closed_routes(from_region: str, to_region: str, include_reverse: bool = True) -> list[dict]:
    routes = [{"from_region": from_region, "to_region": to_region, "message_thread_id": None}]
    if include_reverse and _region_key(from_region) != _region_key(to_region):
        routes.append({"from_region": to_region, "to_region": from_region, "message_thread_id": None})
    return routes


async def list_groups(session: AsyncSession, kind: str | None = None) -> list[Group]:
    stmt = select(Group).order_by(Group.id.desc())
    if kind == "CHANNEL":
        stmt = stmt.where(or_(Group.kind == "CHANNEL", Group.kind == "MANDATORY_SUB_TARGET"))
    elif kind:
        stmt = stmt.where(Group.kind == kind)
    else:
        stmt = stmt.where(Group.kind.in_(("CLOSED", "ROUTE", "MAIN", "CHANNEL", "MANDATORY_SUB_TARGET")))
    result = await session.execute(stmt)
    return list(result.scalars())


async def get_closed_group_for_region(session: AsyncSession, region: str) -> Group | None:
    result = await session.execute(select(Group).where(Group.kind == "CLOSED", Group.region == region))
    exact = result.scalars().first()
    if exact is not None:
        return exact

    wanted = _region_key(region)
    if wanted:
        all_closed = await session.execute(select(Group).where(Group.kind == "CLOSED"))
        for group in all_closed.scalars():
            if group.region and _region_key(group.region) == wanted:
                return group
            for route in group.routes or []:
                if _region_key(route.get("from_region", "")) == wanted:
                    return group

    # Fall back to a catch-all CLOSED group (region left unset on purpose via "🌐 Barcha
    # viloyatlar" when registering) — lets an operator start with a single group and add
    # region-specific ones later without orders silently going nowhere in the meantime.
    fallback = await session.execute(select(Group).where(Group.kind == "CLOSED", Group.region.is_(None)))
    return fallback.scalars().first()


def _region_key(value: str) -> str:
    """Strips the common region-name suffixes so callers on a different naming scheme (e.g.
    the webapp's own region list) can still land on the right group without needing to match
    the bot's `app.data.regions` strings exactly."""
    key = value.strip().lower()
    for suffix in (" respublikasi", " viloyati", " shahri"):
        if key.endswith(suffix):
            key = key[: -len(suffix)]
    return key.strip()


async def get_closed_group_for_region_fuzzy(session: AsyncSession, region: str | None) -> Group | None:
    """Like `get_closed_group_for_region`, but tolerant of a differently-formatted region
    string (webapp callers don't share the bot's exact region dataset) — tries an exact match,
    then a normalized-suffix match against every CLOSED group, then the region-less catch-all."""
    if region:
        exact = await get_closed_group_for_region(session, region)
        if exact is not None:
            return exact

        wanted = _region_key(region)
        if wanted:
            result = await session.execute(select(Group).where(Group.kind == "CLOSED", Group.region.isnot(None)))
            for group in result.scalars():
                if _region_key(group.region) == wanted:
                    return group

    fallback = await session.execute(select(Group).where(Group.kind == "CLOSED", Group.region.is_(None)))
    return fallback.scalars().first()


async def get_route_group_fuzzy(
    session: AsyncSession, from_region: str | None, to_region: str | None
) -> tuple[Group, dict] | None:
    """Finds a ROUTE-kind group carrying a topic for this exact from->to direction (e.g. the
    Toshkent<->Andijon corridor group, one topic per direction). Same suffix-tolerant matching
    as `get_closed_group_for_region_fuzzy`, applied to both ends of the pair. Returns the group
    together with the matched route dict (for its `message_thread_id`), or None if neither
    region is set or no route matches."""
    if not from_region or not to_region:
        return None

    wanted_from = _region_key(from_region)
    wanted_to = _region_key(to_region)
    if not wanted_from or not wanted_to:
        return None

    result = await session.execute(select(Group).where(Group.kind == "ROUTE"))
    for group in result.scalars():
        for route in group.routes or []:
            if _region_key(route.get("from_region", "")) == wanted_from and _region_key(route.get("to_region", "")) == wanted_to:
                return group, route
    return None


async def get_closed_group_for_route_fuzzy(
    session: AsyncSession, from_region: str | None, to_region: str | None, *, either_direction: bool = False
) -> Group | None:
    """CLOSED driver groups that were bound to a specific corridor (Andijon-Toshkent), not just
    a single origin region. Passenger ads must land here only when both ends match — otherwise
    an Andijon→Buxoro order would leak into the Andijon-Toshkent haydovchilar guruhi.
    `either_direction`: a corridor group serves both ways (Toshkent→Andijon too), even if the
    admin only entered one direction."""
    if not from_region or not to_region:
        return None

    wanted_from = _region_key(from_region)
    wanted_to = _region_key(to_region)
    if not wanted_from or not wanted_to:
        return None

    wanted = {(wanted_from, wanted_to)}
    if either_direction:
        wanted.add((wanted_to, wanted_from))

    result = await session.execute(select(Group).where(Group.kind == "CLOSED"))
    for group in result.scalars():
        for route in group.routes or []:
            if (_region_key(route.get("from_region", "")), _region_key(route.get("to_region", ""))) in wanted:
                return group
    return None


async def get_unrouted_closed_group_for_region(session: AsyncSession, region: str | None) -> Group | None:
    """Legacy CLOSED groups that still only have a `region` and no corridor routes — used as
    dispatch fallback so an operator can attach Andijon-Toshkent later without dropping ads
    on the floor in the meantime."""
    if not region:
        fallback = await session.execute(
            select(Group).where(Group.kind == "CLOSED", Group.region.is_(None))
        )
        for group in fallback.scalars():
            if not group.routes:
                return group
        return None

    wanted = _region_key(region)
    result = await session.execute(select(Group).where(Group.kind == "CLOSED"))
    for group in result.scalars():
        if group.routes:
            continue
        if group.region and (_region_key(group.region) == wanted or group.region == region):
            return group

    fallback = await session.execute(select(Group).where(Group.kind == "CLOSED", Group.region.is_(None)))
    for group in fallback.scalars():
        if not group.routes:
            return group
    return None


async def resolve_closed_dispatch_group(
    session: AsyncSession, from_region: str | None, to_region: str | None
) -> Group | None:
    """Passenger ads: corridor CLOSED group first (either direction), then a legacy
    region-only group."""
    group = await get_closed_group_for_route_fuzzy(session, from_region, to_region, either_direction=True)
    if group is not None:
        return group
    return await get_unrouted_closed_group_for_region(session, from_region)


async def resolve_order_dispatch_targets(
    session: AsyncSession, from_region: str | None, to_region: str | None
) -> list[tuple[Group, int | None]]:
    """Every driver group a passenger order should be posted to: the closed haydovchilar group
    for the corridor/region, plus a ROUTE (forum) group's topic for this exact direction.
    Returns (group, message_thread_id) pairs, one per chat."""
    targets: list[tuple[Group, int | None]] = []
    closed = await resolve_closed_dispatch_group(session, from_region, to_region)
    if closed is not None:
        targets.append((closed, None))
    routed = await get_route_group_fuzzy(session, from_region, to_region)
    if routed is not None:
        group, route = routed
        if all(existing.chat_id != group.chat_id for existing, _ in targets):
            targets.append((group, route.get("message_thread_id")))
    return targets


def driver_serves(driver, from_region: str | None, to_region: str | None) -> bool:
    """Whether an order from→to belongs to this driver: it starts in the driver's work region, or
    it is the return leg of the driver's route (driver works Andijon→Toshkent, so a
    Toshkent→Andijon passenger is theirs too)."""
    region = _region_key(driver.region or "")
    if not region or not from_region:
        return False
    if _region_key(from_region) == region:
        return True
    driver_to = _region_key(driver.to_region or "")
    return bool(driver_to) and bool(to_region) and _region_key(from_region) == driver_to and _region_key(to_region) == region


def canonical_region(value: str | None, known: list[str]) -> str | None:
    """Maps a region string from another naming scheme (the website says "Samarqand") onto the
    bot's own name ("Samarqand viloyati"); exact matches win, unknown values pass through."""
    if not value:
        return value
    if value in known:
        return value
    wanted = _region_key(value)
    for name in known:
        if _region_key(name) == wanted:
            return name
    return value


async def get_closed_group_for_driver(session: AsyncSession, driver) -> Group | None:
    to_region = getattr(driver, "to_region", None)
    if to_region:
        matched = await get_closed_group_for_route_fuzzy(session, driver.region, to_region)
        if matched is not None:
            return matched
    return await get_closed_group_for_region(session, driver.region)


async def add_route(
    session: AsyncSession, group: Group, *, from_region: str, to_region: str, message_thread_id: int | None
) -> Group:
    routes = list(group.routes or [])
    routes.append({"from_region": from_region, "to_region": to_region, "message_thread_id": message_thread_id})
    group.routes = routes
    await session.commit()
    await session.refresh(group)
    return group


async def remove_route(session: AsyncSession, group: Group, index: int) -> Group:
    routes = list(group.routes or [])
    if 0 <= index < len(routes):
        routes.pop(index)
        group.routes = routes
        await session.commit()
        await session.refresh(group)
    return group


async def register_group(
    session: AsyncSession,
    *,
    chat_id: int,
    title: str | None,
    kind: str,
    region: str | None,
    added_by_telegram_id: int,
    routes: list | None = None,
    extra_settings: dict | None = None,
) -> Group:
    existing = await get_by_chat_id(session, chat_id)
    if existing:
        existing.title = title
        existing.kind = kind
        existing.region = region
        if routes is not None:
            existing.routes = routes
            flag_modified(existing, "routes")
        if extra_settings:
            existing.settings = {**(existing.settings or {}), **extra_settings}
            flag_modified(existing, "settings")
        await session.commit()
        await session.refresh(existing)
        return existing

    settings = dict(DEFAULT_SETTINGS)
    if extra_settings:
        settings.update(extra_settings)

    group = Group(
        chat_id=chat_id,
        title=title,
        kind=kind,
        region=region,
        settings=settings,
        routes=list(routes or []),
        added_by_telegram_id=added_by_telegram_id,
    )
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return group


async def update_group(
    session: AsyncSession,
    group: Group,
    *,
    title: str | None = None,
    kind: str | None = None,
    region: str | None = None,
    chat_id: int | None = None,
    routes: list | None = None,
    extra_settings: dict | None = None,
) -> Group:
    if title is not None:
        group.title = title
    if kind is not None:
        group.kind = kind
    if region is not None:
        group.region = region
    if chat_id is not None:
        group.chat_id = chat_id
    if routes is not None:
        group.routes = routes
        flag_modified(group, "routes")
    if extra_settings:
        group.settings = {**(group.settings or {}), **extra_settings}
        flag_modified(group, "settings")
    await session.commit()
    await session.refresh(group)
    return group


async def update_settings(session: AsyncSession, group: Group, **patch) -> None:
    group.settings = {**group.settings, **patch}
    await session.commit()


async def add_mandatory_target(session: AsyncSession, *, chat_id: int, title: str, invite_link: str | None) -> Group:
    group = Group(
        chat_id=chat_id,
        title=title,
        kind="MANDATORY_SUB_TARGET",
        settings={"invite_link": invite_link},
        added_by_telegram_id=0,
    )
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return group


async def list_mandatory_targets(session: AsyncSession) -> list[Group]:
    return await list_by_kind(session, "MANDATORY_SUB_TARGET")


async def remove_group(session: AsyncSession, group: Group) -> None:
    await session.delete(group)
    await session.commit()


def check_rate_limit(chat_id: int, user_id: int, window_seconds: int = 60) -> bool:
    """Returns True if the user is allowed to post now (and records this post)."""
    now = time.monotonic()
    chat_state = _rate_limit_state.setdefault(chat_id, {})
    last = chat_state.get(user_id)
    if last is not None and now - last < window_seconds:
        return False
    chat_state[user_id] = now
    return True


async def get_or_create_invite_link(session: AsyncSession, bot, group: Group, referrer_telegram_id: int) -> GroupInviteLink:
    """Returns this member's personal invite link for `group`'s `require_invites` gate,
    creating one via `createChatInviteLink` (and caching it) the first time they ask."""
    result = await session.execute(
        select(GroupInviteLink).where(
            GroupInviteLink.group_id == group.id,
            GroupInviteLink.referrer_telegram_id == referrer_telegram_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    created = await bot.create_chat_invite_link(chat_id=group.chat_id, name=f"ref:{referrer_telegram_id}")
    link = GroupInviteLink(
        group_id=group.id,
        referrer_telegram_id=referrer_telegram_id,
        invite_link=created.invite_link,
    )
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return link


async def get_invite_link_by_url(session: AsyncSession, invite_url: str) -> GroupInviteLink | None:
    result = await session.execute(select(GroupInviteLink).where(GroupInviteLink.invite_link == invite_url))
    return result.scalar_one_or_none()


async def record_invite_join(session: AsyncSession, *, group_id: int, referrer_telegram_id: int, joined_telegram_id: int) -> None:
    if referrer_telegram_id == joined_telegram_id:
        return  # can't count yourself via your own link

    result = await session.execute(
        select(GroupInviteJoin).where(
            GroupInviteJoin.group_id == group_id,
            GroupInviteJoin.joined_telegram_id == joined_telegram_id,
        )
    )
    row = result.scalar_one_or_none()
    if row is not None:
        row.referrer_telegram_id = referrer_telegram_id
        row.left_at = None
        row.joined_at = datetime.now(timezone.utc)
    else:
        session.add(
            GroupInviteJoin(
                group_id=group_id,
                referrer_telegram_id=referrer_telegram_id,
                joined_telegram_id=joined_telegram_id,
            )
        )
    await session.commit()


async def record_invite_leave(session: AsyncSession, *, group_id: int, joined_telegram_id: int) -> None:
    result = await session.execute(
        select(GroupInviteJoin).where(
            GroupInviteJoin.group_id == group_id,
            GroupInviteJoin.joined_telegram_id == joined_telegram_id,
        )
    )
    row = result.scalar_one_or_none()
    if row is not None and row.left_at is None:
        row.left_at = datetime.now(timezone.utc)
        await session.commit()


async def count_active_invites(session: AsyncSession, group_id: int, referrer_telegram_id: int) -> int:
    result = await session.execute(
        select(GroupInviteJoin).where(
            GroupInviteJoin.group_id == group_id,
            GroupInviteJoin.referrer_telegram_id == referrer_telegram_id,
            GroupInviteJoin.left_at.is_(None),
        )
    )
    return len(list(result.scalars()))


async def has_met_invite_requirement(session: AsyncSession, group_id: int, referrer_telegram_id: int) -> bool:
    return await count_active_invites(session, group_id, referrer_telegram_id) >= REQUIRED_INVITES
