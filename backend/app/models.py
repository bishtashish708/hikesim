from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey

from app.db import Base


class Trail(Base):
    __tablename__ = "trails"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    country_code = Column(String(2), nullable=False, index=True)
    state_code = Column(String(8), nullable=True, index=True)
    distance_miles = Column(Float, nullable=False, default=0)
    elevation_gain_ft = Column(Integer, nullable=False, default=0)
    profile_points = Column(JSON, nullable=True)
    is_seed = Column(Boolean, nullable=False, default=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hike_id = Column(Integer, ForeignKey("trails.id"), nullable=False)
    plan_json = Column(JSON, nullable=False)
