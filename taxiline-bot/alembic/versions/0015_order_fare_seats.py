"""order fare & seats: price, payment method, departure slot, whole car, per-seat picks

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-13 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("price", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("payment_method", sa.String(), server_default="cash", nullable=False))
    op.add_column("orders", sa.Column("depart_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("whole_car", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("orders", sa.Column("seat_picks", sa.String(), nullable=True))
    op.add_column("orders", sa.Column("route_km", sa.Float(), nullable=True))
    op.add_column("orders", sa.Column("to_lat", sa.Float(), nullable=True))
    op.add_column("orders", sa.Column("to_lng", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "to_lng")
    op.drop_column("orders", "to_lat")
    op.drop_column("orders", "route_km")
    op.drop_column("orders", "seat_picks")
    op.drop_column("orders", "whole_car")
    op.drop_column("orders", "depart_at")
    op.drop_column("orders", "payment_method")
    op.drop_column("orders", "price")
