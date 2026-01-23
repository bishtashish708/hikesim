from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.trails import router as trails_router
from app.api.plans import router as plans_router

app = FastAPI(title="HikeSim API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trails_router)
app.include_router(plans_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
