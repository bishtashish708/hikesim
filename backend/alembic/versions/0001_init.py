from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("state_code", sa.String(length=8), nullable=True),
        sa.Column("distance_miles", sa.Float(), nullable=False, server_default="0"),
        sa.Column("elevation_gain_ft", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("profile_points", sa.JSON(), nullable=True),
        sa.Column("is_seed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_trails_name", "trails", ["name"])
    op.create_index("ix_trails_country_code", "trails", ["country_code"])
    op.create_index("ix_trails_state_code", "trails", ["state_code"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "training_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("hike_id", sa.Integer(), sa.ForeignKey("trails.id"), nullable=False),
        sa.Column("plan_json", sa.JSON(), nullable=False),
    )


def downgrade():
    op.drop_table("training_plans")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_trails_state_code", table_name="trails")
    op.drop_index("ix_trails_country_code", table_name="trails")
    op.drop_index("ix_trails_name", table_name="trails")
    op.drop_table("trails")
