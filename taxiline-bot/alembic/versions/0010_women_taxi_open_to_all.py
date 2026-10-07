"""women taxi: orders.opened_to_all_at (female drivers first, then everyone)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-07 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("opened_to_all_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "opened_to_all_at")
