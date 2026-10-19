"""group post events: repeat-ad guard (cooldown, duplicates, temporary mutes)

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-19 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_post_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("user_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("user_name", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("fingerprint", sa.String(), nullable=True),
        sa.Column("phones", sa.String(), nullable=True),
        sa.Column("until", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_group_post_events_created_at", "group_post_events", ["created_at"])
    op.create_index(
        "ix_group_post_events_user", "group_post_events", ["chat_id", "user_telegram_id", "kind", "created_at"]
    )
    op.create_index("ix_group_post_events_chat", "group_post_events", ["chat_id", "kind", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_group_post_events_chat", table_name="group_post_events")
    op.drop_index("ix_group_post_events_user", table_name="group_post_events")
    op.drop_index("ix_group_post_events_created_at", table_name="group_post_events")
    op.drop_table("group_post_events")
