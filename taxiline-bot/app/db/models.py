from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Index, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Role/status/kind fields are plain strings (not DB enums) on purpose — this schema will grow
# fast as the driver-side TZ lands, and Alembic enum migrations are far more painful than a
# string column validated at the service layer.


class BotUser(Base):
    __tablename__ = "bot_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    core_user_id: Mapped[str | None] = mapped_column(nullable=True)  # server/'s Prisma User.id

    phone: Mapped[str | None] = mapped_column(nullable=True)
    name: Mapped[str | None] = mapped_column(nullable=True)
    username: Mapped[str | None] = mapped_column(nullable=True)
    language: Mapped[str] = mapped_column(default="uz")  # uz | ru | en
    address: Mapped[str | None] = mapped_column(nullable=True)

    role: Mapped[str] = mapped_column(default="CLIENT")  # CLIENT | DRIVER
    is_admin: Mapped[bool] = mapped_column(default=False)
    blocked: Mapped[bool] = mapped_column(default=False)
    # Set by Sozlamalar -> Chiqib ketish. The row (and trip history) is kept, but the next
    # /start shows the Kirish/Ro'yxatdan o'tish choice instead of silently logging back in.
    logged_out: Mapped[bool] = mapped_column(default=False)
    trips_count: Mapped[int] = mapped_column(default=0)

    registered_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    driver_profile: Mapped["DriverProfile | None"] = relationship(back_populates="bot_user", uselist=False)


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    bot_user_id: Mapped[int] = mapped_column(ForeignKey("bot_users.id", ondelete="CASCADE"), unique=True)

    full_name: Mapped[str] = mapped_column()
    phone: Mapped[str] = mapped_column()
    car_model: Mapped[str] = mapped_column()
    plate: Mapped[str] = mapped_column()
    region: Mapped[str] = mapped_column(index=True)  # operating ("from") region — used for dispatch matching
    to_region: Mapped[str | None] = mapped_column(nullable=True)  # informational only, not used in matching
    language: Mapped[str] = mapped_column(default="uz")
    # MALE | FEMALE | None (not stated yet — drivers who registered before this field existed).
    # Only FEMALE drivers receive / may claim "Ayollar uchun taxi" (Order.women_only) orders.
    gender: Mapped[str | None] = mapped_column(nullable=True, index=True)

    status: Mapped[str] = mapped_column(default="PENDING", index=True)  # PENDING | APPROVED | REJECTED
    rejection_reason: Mapped[str | None] = mapped_column(nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    # Set when their chat_join_request into the region's closed group is auto-approved — this,
    # not approved_at, is when the DriverSubscription actually starts.
    joined_group_at: Mapped[datetime | None] = mapped_column(nullable=True)
    blocked: Mapped[bool] = mapped_column(default=False)
    # Incremented whenever a claimed order times out on this driver without an "enroute"
    # confirmation — surfaced to admins so repeat offenders can be blocked.
    no_show_count: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    bot_user: Mapped["BotUser"] = relationship(back_populates="driver_profile")
    subscription: Mapped["DriverSubscription | None"] = relationship(back_populates="driver", uselist=False)


class DriverSubscription(Base):
    __tablename__ = "driver_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    driver_profile_id: Mapped[int] = mapped_column(ForeignKey("driver_profiles.id", ondelete="CASCADE"), unique=True)

    started_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column()
    active: Mapped[bool] = mapped_column(default=True, index=True)
    expiry_notified_at: Mapped[datetime | None] = mapped_column(nullable=True)

    driver: Mapped["DriverProfile"] = relationship(back_populates="subscription")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    title: Mapped[str | None] = mapped_column(nullable=True)
    kind: Mapped[str] = mapped_column(default="MAIN")  # MAIN | CLOSED | ROUTE
    region: Mapped[str | None] = mapped_column(nullable=True, index=True)
    language: Mapped[str | None] = mapped_column(nullable=True)

    # anti_spam, delete_join_leave, rate_limit_enabled, restrict_non_admin_posts,
    # mandatory_sub_targets: [{"chat": "@channel", "label": "..."}]
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    # ROUTE-kind groups only: a forum supergroup with one topic per direction (e.g. one group
    # for the Toshkent<->Andijon corridor, topic 3 for Toshkent->Andijon, topic 2 for the
    # reverse) — a list of {"from_region", "to_region", "message_thread_id"} dicts. Kept
    # separate from the single `region`/`kind` fields above since one chat can carry several
    # direction pairs, each posting into its own topic.
    routes: Mapped[list] = mapped_column(JSON, default=list)

    added_by_telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class GroupInviteLink(Base):
    """A member's personal `createChatInviteLink` link for one group's `require_invites` gate —
    cached so repeated "Odam qo'shish" taps reuse the same link instead of minting a new one."""

    __tablename__ = "group_invite_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    referrer_telegram_id: Mapped[int] = mapped_column(BigInteger, index=True)
    invite_link: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (UniqueConstraint("group_id", "referrer_telegram_id", name="uq_group_invite_link_referrer"),)


class GroupInviteJoin(Base):
    """One row per person who joined a `require_invites`-gated group via someone's personal
    link — `left_at` set when they leave, so a referrer's live count excludes them."""

    __tablename__ = "group_invite_joins"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    referrer_telegram_id: Mapped[int] = mapped_column(BigInteger, index=True)
    joined_telegram_id: Mapped[int] = mapped_column(BigInteger)
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())
    left_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (UniqueConstraint("group_id", "joined_telegram_id", name="uq_group_invite_join_member"),)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    bot_user_id: Mapped[int] = mapped_column(ForeignKey("bot_users.id", ondelete="CASCADE"))

    passenger_name: Mapped[str] = mapped_column()
    passenger_phone: Mapped[str] = mapped_column()
    for_someone_else: Mapped[bool] = mapped_column(default=False)
    contact_note: Mapped[str | None] = mapped_column(nullable=True)  # free-text / forwarded location caption

    pickup_lat: Mapped[float | None] = mapped_column(nullable=True)
    pickup_lng: Mapped[float | None] = mapped_column(nullable=True)
    pickup_text: Mapped[str | None] = mapped_column(nullable=True)

    from_region: Mapped[str] = mapped_column(index=True)
    from_district: Mapped[str] = mapped_column()
    to_region: Mapped[str] = mapped_column()
    to_district: Mapped[str] = mapped_column()

    car_brand: Mapped[str] = mapped_column()
    seat: Mapped[str] = mapped_column()
    passengers: Mapped[int] = mapped_column()
    luggage_size: Mapped[str] = mapped_column()
    when_text: Mapped[str] = mapped_column()

    # "Ayollar uchun taxi": offered to female drivers first; every surface (group card, driver
    # DM, website, admin panel) renders it in its own pink style.
    women_only: Mapped[bool] = mapped_column(default=False, server_default="false", index=True)
    # When a women-only order stopped being female-drivers-only — straight away if no female
    # driver serves the route, else after trips.WOMEN_FIRST_MINUTES unclaimed. None = still
    # female-only (or not a women-only order at all).
    opened_to_all_at: Mapped[datetime | None] = mapped_column(nullable=True)
    # Who is travelling: MALE | FEMALE | COUPLE | None (unknown, e.g. older orders).
    passenger_gender: Mapped[str | None] = mapped_column(nullable=True)

    source: Mapped[str] = mapped_column(default="BOT")  # BOT | WEBAPP | GROUP
    status: Mapped[str] = mapped_column(default="OPEN", index=True)  # OPEN | CLAIMED | CLOSED | CANCELLED
    assigned_driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("driver_profiles.id", ondelete="SET NULL"), nullable=True
    )
    claimed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    # When the order left the active pipeline for good — COMPLETED by the driver, or
    # CLOSED/CANCELLED by an admin. Lets statistics count finishes by when they happened.
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    __table_args__ = (Index("ix_orders_status_created", "status", "created_at"),)


class OrderDispatch(Base):
    __tablename__ = "order_dispatches"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger)
    message_id: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column()  # GROUP | DRIVER_DM
    language: Mapped[str] = mapped_column(default="uz")


class CargoDispatch(Base):
    """One Telegram copy of a website cargo order ("Yetkazib berish"): a closed-group post or a
    driver DM. The order itself lives on server/ (string cuid id); `card` is the public text we
    posted, reused when the order is taken, delivered or cancelled."""

    __tablename__ = "cargo_dispatches"

    id: Mapped[int] = mapped_column(primary_key=True)
    cargo_order_id: Mapped[str] = mapped_column(index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger)
    message_id: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column()  # GROUP | DRIVER_DM
    card: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now())


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)
    bot_user_id: Mapped[int] = mapped_column(ForeignKey("bot_users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column()
    status: Mapped[str] = mapped_column(default="OPEN", index=True)  # OPEN | IN_PROGRESS | RESOLVED
    admin_reply: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    bot_user_id: Mapped[int] = mapped_column(ForeignKey("bot_users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(default="OPEN", index=True)  # OPEN | CLOSED
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    messages: Mapped[list["SupportMessage"]] = relationship(back_populates="ticket", order_by="SupportMessage.id")


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id", ondelete="CASCADE"), index=True)
    from_admin: Mapped[bool] = mapped_column(default=False)
    admin_telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    text: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    ticket: Mapped["SupportTicket"] = relationship(back_populates="messages")


class Broadcast(Base):
    __tablename__ = "broadcasts"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_by_telegram_id: Mapped[int] = mapped_column(BigInteger)
    payload: Mapped[dict] = mapped_column(JSON)  # {text, media, buttons, tts}
    audience_filter: Mapped[dict] = mapped_column(JSON, default=dict)  # {role, region}
    sent_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class AdminGrant(Base):
    """A telegram_id an admin has promoted via 'Admin qo'shish' before that person has ever
    /start-ed the bot. BotUser.is_admin is set immediately if they already exist; otherwise
    this row is checked at registration time (services/users.py) so admin rights apply the
    moment they do show up, in whatever order that happens."""

    __tablename__ = "admin_grants"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    granted_by_telegram_id: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class GroupAd(Base):
    """One member message caught in a group with `ad_router` on: the bot deletes it, asks
    "yo'lovchimisiz yoki haydovchi?", and — for a passenger — reposts it as a card in the
    linked closed driver group. The row is also what remembers someone's answer for a while
    (bot_config "group_ads.role_memory_hours") so they aren't asked on every message."""

    __tablename__ = "group_ads"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_chat_id: Mapped[int] = mapped_column(BigInteger, index=True)
    target_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    author_telegram_id: Mapped[int] = mapped_column(BigInteger, index=True)
    author_name: Mapped[str] = mapped_column()
    author_username: Mapped[str | None] = mapped_column(nullable=True)
    text: Mapped[str] = mapped_column()
    photo_file_id: Mapped[str | None] = mapped_column(nullable=True)

    role: Mapped[str | None] = mapped_column(nullable=True)  # PASSENGER | DRIVER
    # PENDING (question asked) | SENT (card in the closed group) | TAKEN (a driver took it) |
    # DRIVER (told to contact admin) | EXPIRED (never answered) | CANCELLED (passenger withdrew)
    status: Mapped[str] = mapped_column(default="PENDING", index=True)

    # The bot's own message in the source group: the question, later edited into the notice.
    prompt_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    prompt_deleted: Mapped[bool] = mapped_column(default=False, server_default="false")
    card_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    taken_by_telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    taken_by_name: Mapped[str | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
    answered_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (Index("ix_group_ads_author_chat", "author_telegram_id", "source_chat_id"),)


class BotSetting(Base):
    """Runtime-editable bot settings (admin dashboard "Bot sozlamalari"). Only overrides are
    stored; app/services/bot_config.py holds the defaults and the in-memory cache."""

    __tablename__ = "bot_settings"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
