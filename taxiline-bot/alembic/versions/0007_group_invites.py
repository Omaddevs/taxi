"""add group_invite_links and group_invite_joins for the require_invites gate

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-07 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_invite_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referrer_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("invite_link", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("group_id", "referrer_telegram_id", name="uq_group_invite_link_referrer"),
    )
    op.create_index("ix_group_invite_links_group_id", "group_invite_links", ["group_id"])
    op.create_index("ix_group_invite_links_referrer_telegram_id", "group_invite_links", ["referrer_telegram_id"])

    op.create_table(
        "group_invite_joins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referrer_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("joined_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("left_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("group_id", "joined_telegram_id", name="uq_group_invite_join_member"),
    )
    op.create_index("ix_group_invite_joins_group_id", "group_invite_joins", ["group_id"])
    op.create_index("ix_group_invite_joins_referrer_telegram_id", "group_invite_joins", ["referrer_telegram_id"])


def downgrade() -> None:
    op.drop_index("ix_group_invite_joins_referrer_telegram_id", table_name="group_invite_joins")
    op.drop_index("ix_group_invite_joins_group_id", table_name="group_invite_joins")
    op.drop_table("group_invite_joins")

    op.drop_index("ix_group_invite_links_referrer_telegram_id", table_name="group_invite_links")
    op.drop_index("ix_group_invite_links_group_id", table_name="group_invite_links")
    op.drop_table("group_invite_links")
