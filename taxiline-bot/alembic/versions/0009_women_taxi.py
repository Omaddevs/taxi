"""women taxi: orders.women_only / orders.passenger_gender, driver_profiles.gender

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-07 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders", sa.Column("women_only", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    op.create_index("ix_orders_women_only", "orders", ["women_only"])
    op.add_column("orders", sa.Column("passenger_gender", sa.String(), nullable=True))
    op.add_column("driver_profiles", sa.Column("gender", sa.String(), nullable=True))
    op.create_index("ix_driver_profiles_gender", "driver_profiles", ["gender"])


def downgrade() -> None:
    op.drop_index("ix_driver_profiles_gender", table_name="driver_profiles")
    op.drop_column("driver_profiles", "gender")
    op.drop_column("orders", "passenger_gender")
    op.drop_index("ix_orders_women_only", table_name="orders")
    op.drop_column("orders", "women_only")
