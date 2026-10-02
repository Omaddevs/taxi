"""driver lifecycle: to_region + joined_group_at

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-26 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("driver_profiles", sa.Column("to_region", sa.String(), nullable=True))
    op.add_column("driver_profiles", sa.Column("joined_group_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("driver_profiles", "joined_group_at")
    op.drop_column("driver_profiles", "to_region")
