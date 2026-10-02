"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-26 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bot_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("core_user_id", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("language", sa.String(), nullable=False, server_default="uz"),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="CLIENT"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("blocked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("trips_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registered_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bot_users_telegram_id", "bot_users", ["telegram_id"], unique=True)

    op.create_table(
        "driver_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "bot_user_id", sa.Integer(), sa.ForeignKey("bot_users.id", ondelete="CASCADE"), nullable=False, unique=True
        ),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("car_model", sa.String(), nullable=False),
        sa.Column("plate", sa.String(), nullable=False),
        sa.Column("region", sa.String(), nullable=False),
        sa.Column("language", sa.String(), nullable=False, server_default="uz"),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING"),
        sa.Column("rejection_reason", sa.String(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("blocked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_driver_profiles_region", "driver_profiles", ["region"])
    op.create_index("ix_driver_profiles_status", "driver_profiles", ["status"])

    op.create_table(
        "driver_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "driver_profile_id",
            sa.Integer(),
            sa.ForeignKey("driver_profiles.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("started_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expiry_notified_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_driver_subscriptions_active", "driver_subscriptions", ["active"])

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False, server_default="MAIN"),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("language", sa.String(), nullable=True),
        sa.Column("settings", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("added_by_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_groups_chat_id", "groups", ["chat_id"], unique=True)
    op.create_index("ix_groups_region", "groups", ["region"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bot_user_id", sa.Integer(), sa.ForeignKey("bot_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("passenger_name", sa.String(), nullable=False),
        sa.Column("passenger_phone", sa.String(), nullable=False),
        sa.Column("for_someone_else", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("contact_note", sa.String(), nullable=True),
        sa.Column("pickup_lat", sa.Float(), nullable=True),
        sa.Column("pickup_lng", sa.Float(), nullable=True),
        sa.Column("pickup_text", sa.String(), nullable=True),
        sa.Column("from_region", sa.String(), nullable=False),
        sa.Column("from_district", sa.String(), nullable=False),
        sa.Column("to_region", sa.String(), nullable=False),
        sa.Column("to_district", sa.String(), nullable=False),
        sa.Column("car_brand", sa.String(), nullable=False),
        sa.Column("seat", sa.String(), nullable=False),
        sa.Column("passengers", sa.Integer(), nullable=False),
        sa.Column("luggage_size", sa.String(), nullable=False),
        sa.Column("when_text", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False, server_default="BOT"),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_orders_from_region", "orders", ["from_region"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])
    op.create_index("ix_orders_status_created", "orders", ["status", "created_at"])

    op.create_table(
        "order_dispatches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("language", sa.String(), nullable=False, server_default="uz"),
    )
    op.create_index("ix_order_dispatches_order_id", "order_dispatches", ["order_id"])

    op.create_table(
        "complaints",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bot_user_id", sa.Integer(), sa.ForeignKey("bot_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_complaints_status", "complaints", ["status"])

    op.create_table(
        "support_tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bot_user_id", sa.Integer(), sa.ForeignKey("bot_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])

    op.create_table(
        "support_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "ticket_id", sa.Integer(), sa.ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("from_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("admin_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_support_messages_ticket_id", "support_messages", ["ticket_id"])

    op.create_table(
        "broadcasts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_by_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("audience_filter", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("broadcasts")
    op.drop_table("support_messages")
    op.drop_table("support_tickets")
    op.drop_table("complaints")
    op.drop_table("order_dispatches")
    op.drop_table("orders")
    op.drop_table("groups")
    op.drop_table("driver_subscriptions")
    op.drop_table("driver_profiles")
    op.drop_table("bot_users")
