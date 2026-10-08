"""cargo dispatches: Telegram copies of website cargo orders

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-08 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cargo_dispatches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cargo_order_id", sa.String(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("card", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_cargo_dispatches_cargo_order_id", "cargo_dispatches", ["cargo_order_id"])


def downgrade() -> None:
    op.drop_index("ix_cargo_dispatches_cargo_order_id", table_name="cargo_dispatches")
    op.drop_table("cargo_dispatches")
