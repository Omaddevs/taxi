"""formatted ads: group ads reposted with the TaxiLine header, for their freshness label

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-09 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "formatted_ads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=False),
        sa.Column("author_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("author_name", sa.String(), nullable=False),
        sa.Column("author_username", sa.String(), nullable=True),
        sa.Column("body_html", sa.String(), nullable=False),
        sa.Column("is_passenger", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("has_photo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("chat_button", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("final", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_formatted_ads_final", "formatted_ads", ["final"])
    op.create_index("ix_formatted_ads_created_at", "formatted_ads", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_formatted_ads_created_at", table_name="formatted_ads")
    op.drop_index("ix_formatted_ads_final", table_name="formatted_ads")
    op.drop_table("formatted_ads")
