import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Trail
from app.schemas import TrailListResponse, TrendingResponse, TrailOut

router = APIRouter(prefix="/trails", tags=["trails"])


@router.get("", response_model=TrailListResponse)
def list_trails(
    country: str = Query(..., min_length=2, max_length=2),
    state: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Trail).filter(Trail.country_code == country.upper())
    if state:
        query = query.filter(Trail.state_code == state.upper())
    items = query.order_by(Trail.name.asc()).all()
    return {"items": items}


def _stable_int(value: str, mod: int) -> int:
    digest = hashlib.md5(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % mod


def _difficulty(distance_miles: float, elevation_gain_ft: int) -> str:
    if distance_miles >= 8 or elevation_gain_ft >= 2500:
        return "Strenuous"
    if distance_miles >= 5 or elevation_gain_ft >= 1500:
        return "Moderate"
    return "Easy"


@router.get("/trending", response_model=TrendingResponse)
def trending_trails(
    country: str = Query(..., min_length=2, max_length=2),
    states: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    min_reviews: int = Query(default=1000, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Trail).filter(Trail.country_code == country.upper())
    selected_states: list[str] = []
    if states:
        selected_states = [state.strip().upper() for state in states.split(",") if state.strip()]
        if selected_states:
            query = query.filter(Trail.state_code.in_(selected_states))

    trails = query.all()
    items = []
    for trail in trails:
        seed = f"{trail.id}:{trail.name}:{trail.state_code or ''}:{trail.country_code}"
        review_spread = 3500
        reviews = min_reviews + _stable_int(seed, review_spread)
        rating = 4.1 + (_stable_int(f"{seed}:rating", 80) / 100)
        popularity_score = round(
            min(99.9, (reviews / (min_reviews + review_spread)) * 100 + rating), 1
        )
        items.append(
            {
                "id": trail.id,
                "name": trail.name,
                "country_code": trail.country_code,
                "state_code": trail.state_code,
                "distance_miles": trail.distance_miles,
                "elevation_gain_ft": trail.elevation_gain_ft,
                "difficulty": _difficulty(trail.distance_miles, trail.elevation_gain_ft),
                "rating": round(rating, 1),
                "reviews": reviews,
                "popularity_score": popularity_score,
            }
        )

    filtered = [item for item in items if item["reviews"] >= min_reviews]
    filtered.sort(key=lambda item: (-item["popularity_score"], -item["reviews"]))

    start = (page - 1) * limit
    end = start + limit
    page_items = filtered[start:end]
    for index, item in enumerate(page_items, start=start + 1):
        item["rank"] = index

    return {
        "items": page_items,
        "country_code": country.upper(),
        "states": selected_states,
        "has_more": end < len(filtered),
    }


@router.get("/{trail_id}", response_model=TrailOut)
def get_trail(trail_id: int, db: Session = Depends(get_db)):
    trail = db.query(Trail).filter(Trail.id == trail_id).first()
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found.")
    return trail
