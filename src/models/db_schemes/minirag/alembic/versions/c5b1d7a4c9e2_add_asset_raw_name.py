"""add asset raw name

Revision ID: c5b1d7a4c9e2
Revises: 243ca8b683b0
Create Date: 2026-06-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5b1d7a4c9e2'
down_revision: Union[str, None] = '243ca8b683b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'assets',
        sa.Column('asset_raw_name', sa.String(), nullable=True),
    )

    op.execute(
        "UPDATE assets SET asset_raw_name = asset_name WHERE asset_raw_name IS NULL"
    )

    op.alter_column(
        'assets',
        'asset_raw_name',
        existing_type=sa.String(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column('assets', 'asset_raw_name')