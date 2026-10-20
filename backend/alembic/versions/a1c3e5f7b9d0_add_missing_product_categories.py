"""add_missing_product_categories

Revision ID: a1c3e5f7b9d0
Revises: 089f6eb41b51
Create Date: 2026-10-20
"""
from alembic import op

revision = 'a1c3e5f7b9d0'
down_revision = '089f6eb41b51'
branch_labels = None
depends_on = None


def upgrade():
    for value in ('MASCOTAS', 'BEBES', 'HOGAR_BAZAR', 'FARMACIA_SALUD', 'ELECTRO_TECNOLOGIA'):
        op.execute(f"ALTER TYPE productcategory ADD VALUE IF NOT EXISTS '{value}'")


def downgrade():
    pass  # PostgreSQL no soporta DROP VALUE de un enum
