HikeSim Web App - App Details

Purpose
- Convert real hikes into treadmill-ready training plans with week-by-week sessions.
- Help users pick hikes, view trending trails, and generate a structured plan.

Key Pages and Flows
- Landing: sign-up/sign-in entry point with hero messaging.
- Hikes list: browse trails with country/state filters and trending panel.
- Hike detail: generate a training plan and adjust sessions.
- Preview: read-only training plan demo.

Training Plan Logic (High Level)
- buildTrainingPlan in src/lib/training/buildTrainingPlan.ts is the core engine.
- It computes weeks between dates, sets weekly volume targets, and schedules
  cardio + strength sessions based on user-selected counts.
- Cardio types: treadmill intervals, zone-2 incline walk, outdoor long hike.
- Strength can be on separate days or stacked on cardio days (strength first).
- Includes build, deload, and taper weeks with warnings for aggressive plans.

Trail Data
- Preloaded trails for US and India are stored in data/trails/preloaded.json.
- Dataset is fetched from Wikidata using scripts/fetch-wikidata-trails.mjs.
- Seed script (prisma/seed.ts) loads both the seed hikes and preloaded dataset.

APIs (Selected)
- GET /api/hikes/list: filtered hike list by country/state.
- GET /api/hikes/trending: trending hikes with computed ratings/review counts.
- POST /api/hikes/import, /api/hikes/import-all: legacy import endpoints (dev only).

Notes
- Distance/Elevation can be "TBD" for trails missing length metadata.
- Trending cards display ratings/reviews as computed placeholders.
