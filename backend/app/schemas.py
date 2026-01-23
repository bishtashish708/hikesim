from typing import List, Optional
from pydantic import BaseModel


class TrailOut(BaseModel):
    id: int
    name: str
    country_code: str
    state_code: Optional[str]
    distance_miles: float
    elevation_gain_ft: int
    is_seed: bool

    class Config:
        from_attributes = True


class TrailListResponse(BaseModel):
    items: List[TrailOut]


class TrendingHikeOut(BaseModel):
    id: int
    name: str
    country_code: str
    state_code: Optional[str]
    distance_miles: float
    elevation_gain_ft: int
    difficulty: str
    rating: float
    reviews: int
    popularity_score: float
    rank: int

    class Config:
        from_attributes = True


class TrendingResponse(BaseModel):
    items: List[TrendingHikeOut]
    country_code: Optional[str] = None
    states: List[str] = []
    has_more: bool = False


class PlanHike(BaseModel):
    distance_miles: float
    elevation_gain_ft: int
    profile_points: Optional[List[dict]] = None


class PlanRequest(BaseModel):
    hike_id: Optional[int] = None
    hike: Optional[PlanHike] = None
    training_start_date: str
    target_date: str
    days_per_week: int
    fitness_level: str
    treadmill_sessions_per_week: int
    outdoor_hikes_per_week: int
    strength_sessions_per_week: int
    treadmill_max_incline_percent: int
    max_speed_mph: float
    include_strength: bool = True
    strength_on_cardio_days: bool = False
    baseline_minutes: int = 30
    fill_active_recovery_days: bool = False
    preferred_days: List[int] = []
    any_days: bool = True


class PlanResponse(BaseModel):
    plan: dict
