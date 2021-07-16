# pylint: disable=invalid-name
"""Initial schema

Revision ID: 04a8c809da98
Revises:
Create Date: 2021-07-15 23:53:10.212305+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "04a8c809da98"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "organization",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(length=200), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("organization_pkey")),
        sa.UniqueConstraint("name", name=op.f("organization_name_key")),
    )
    op.create_table(
        "admin_user",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("organization_id", sa.String(length=200), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            name=op.f("admin_user_organization_id_fkey"),
            ondelete="cascade",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("admin_user_pkey")),
        sa.UniqueConstraint("email", name=op.f("admin_user_email_key")),
    )
    op.create_table(
        "election",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(length=200), nullable=False),
        sa.Column("organization_id", sa.String(length=200), nullable=False),
        sa.Column("definition", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organization.id"],
            name=op.f("election_organization_id_fkey"),
            ondelete="cascade",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("election_pkey")),
    )
    op.create_table(
        "voter",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(length=200), nullable=False),
        sa.Column("external_id", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("precinct", sa.String(length=200), nullable=False),
        sa.Column("ballot_style", sa.String(length=200), nullable=False),
        sa.Column("was_manually_added", sa.Boolean(), nullable=False),
        sa.Column("election_id", sa.String(length=200), nullable=False),
        sa.Column("ballot_url_token", sa.String(length=200), nullable=True),
        sa.Column("ballot_email_last_sent_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["election_id"],
            ["election.id"],
            name=op.f("voter_election_id_fkey"),
            ondelete="cascade",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("voter_pkey")),
        sa.UniqueConstraint(
            "ballot_url_token", name=op.f("voter_ballot_url_token_key")
        ),
        sa.UniqueConstraint(
            "election_id", "email", name=op.f("voter_election_id_email_key")
        ),
        sa.UniqueConstraint(
            "election_id", "external_id", name=op.f("voter_election_id_external_id_key")
        ),
    )


def downgrade():
    pass
