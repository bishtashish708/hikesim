from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Trail
from app.schemas import PlanRequest, PlanResponse
from app.services.plan import build_training_plan

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("/generate", response_model=PlanResponse)
def generate_plan(payload: PlanRequest, db: Session = Depends(get_db)):
    hike = None
    if payload.hike:
        hike = {
            "distance_miles": payload.hike.distance_miles,
            "elevation_gain_ft": payload.hike.elevation_gain_ft,
            "profile_points": payload.hike.profile_points or [],
        }
    elif payload.hike_id:
        trail = db.query(Trail).filter(Trail.id == payload.hike_id).first()
        if not trail:
            raise HTTPException(status_code=404, detail="Trail not found.")
        hike = {
            "distance_miles": trail.distance_miles,
            "elevation_gain_ft": trail.elevation_gain_ft,
            "profile_points": trail.profile_points or [],
        }
    else:
        raise HTTPException(status_code=400, detail="Missing hike data.")
    plan = build_training_plan(payload.model_dump(), hike)
    return {"plan": plan}
