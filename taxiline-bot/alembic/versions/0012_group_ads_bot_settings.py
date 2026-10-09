"""group ads (passenger/driver routing from public groups) and runtime bot settings

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-09 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_ads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_chat_id", sa.BigInteger(), nullable=False),
        sa.Column("target_chat_id", sa.BigInteger(), nullable=True),
        sa.Column("author_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("author_name", sa.String(), nullable=False),
        sa.Column("author_username", sa.String(), nullable=True),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("photo_file_id", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING"),
        sa.Column("prompt_message_id", sa.BigInteger(), nullable=True),
        sa.Column("prompt_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("card_message_id", sa.BigInteger(), nullable=True),
        sa.Column("taken_by_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("taken_by_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_group_ads_source_chat_id", "group_ads", ["source_chat_id"])
    op.create_index("ix_group_ads_author_telegram_id", "group_ads", ["author_telegram_id"])
    op.create_index("ix_group_ads_status", "group_ads", ["status"])
    op.create_index("ix_group_ads_created_at", "group_ads", ["created_at"])
    op.create_index("ix_group_ads_author_chat", "group_ads", ["author_telegram_id", "source_chat_id"])

    op.create_table(
        "bot_settings",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("bot_settings")
    op.drop_index("ix_group_ads_author_chat", table_name="group_ads")
    op.drop_index("ix_group_ads_created_at", table_name="group_ads")
    op.drop_index("ix_group_ads_status", table_name="group_ads")
    op.drop_index("ix_group_ads_author_telegram_id", table_name="group_ads")
    op.drop_index("ix_group_ads_source_chat_id", table_name="group_ads")
    op.drop_table("group_ads")
