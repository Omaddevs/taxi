"""order claim/timeout tracking + driver no-show count

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-26 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("driver_profiles", sa.Column("no_show_count", sa.Integer(), nullable=False, server_default="0"))

    op.add_column(
        "orders",
        sa.Column("assigned_driver_id", sa.Integer(), sa.ForeignKey("driver_profiles.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("orders", sa.Column("claimed_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("confirmed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "confirmed_at")
    op.drop_column("orders", "claimed_at")
    op.drop_column("orders", "assigned_driver_id")
    op.drop_column("driver_profiles", "no_show_count")
