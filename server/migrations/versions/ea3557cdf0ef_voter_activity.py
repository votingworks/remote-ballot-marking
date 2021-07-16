# pylint: disable=invalid-name
"""Voter activity

Revision ID: ea3557cdf0ef
Revises: 04a8c809da98
Create Date: 2021-07-15 23:57:39.602461+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ea3557cdf0ef"
down_revision = "04a8c809da98"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "voter_activity",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(length=200), nullable=False),
        sa.Column("voter_id", sa.String(length=200), nullable=False),
        sa.Column("activity_name", sa.String(length=200), nullable=False),
        sa.Column("info", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["voter_id"],
            ["voter.id"],
            name=op.f("voter_activity_voter_id_fkey"),
            ondelete="cascade",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("voter_activity_pkey")),
    )


def downgrade():
    pass
