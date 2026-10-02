"""add orders.finished_at for statistics

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-30 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("finished_at", sa.DateTime(), nullable=True))
    op.create_index("ix_orders_finished_at", "orders", ["finished_at"])
    # Best-effort backfill for orders finished before this column existed.
    op.execute(
        "UPDATE orders SET finished_at = COALESCE(confirmed_at, claimed_at, created_at) "
        "WHERE status IN ('COMPLETED', 'CLOSED', 'CANCELLED')"
    )


def downgrade() -> None:
    op.drop_index("ix_orders_finished_at", table_name="orders")
    op.drop_column("orders", "finished_at")
