"""call logs: «Tel qilish» taps from ad cards (Bot sozlamalari → Aloqa)

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-09 16:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "call_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ad_kind", sa.String(), nullable=False),
        sa.Column("ad_id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("owner_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("owner_name", sa.String(), nullable=True),
        sa.Column("owner_username", sa.String(), nullable=True),
        sa.Column("owner_role", sa.String(), nullable=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=True),
        sa.Column("chat_title", sa.String(), nullable=True),
        sa.Column("caller_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("caller_name", sa.String(), nullable=True),
        sa.Column("caller_username", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("ip", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_call_logs_phone", "call_logs", ["phone"])
    op.create_index("ix_call_logs_caller_telegram_id", "call_logs", ["caller_telegram_id"])
    op.create_index("ix_call_logs_created_at", "call_logs", ["created_at"])
    op.create_index("ix_call_logs_ad", "call_logs", ["ad_kind", "ad_id"])


def downgrade() -> None:
    op.drop_index("ix_call_logs_ad", table_name="call_logs")
    op.drop_index("ix_call_logs_created_at", table_name="call_logs")
    op.drop_index("ix_call_logs_caller_telegram_id", table_name="call_logs")
    op.drop_index("ix_call_logs_phone", table_name="call_logs")
    op.drop_table("call_logs")
