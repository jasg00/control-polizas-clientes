"""add_poliza_deleted_at

Revision ID: 23b2a8d9f4e1
Revises: 067b4a044853
Create Date: 2026-05-03 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "23b2a8d9f4e1"
down_revision: Union[str, None] = "067b4a044853"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("polizas", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_polizas_deleted_at"), "polizas", ["deleted_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_polizas_deleted_at"), table_name="polizas")
    op.drop_column("polizas", "deleted_at")
