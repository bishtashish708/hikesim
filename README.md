## HikeSim

HikeSim converts real hikes into treadmill-ready training plans with time-based
segments (incline + speed) plus warm-up and cool-down.

## Getting Started

Install dependencies and set up the database:

```bash
npm install
npm run db:push
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Seed Data

- Seed hikes live in `prisma/seed.ts` and include 8–10 popular hikes (including
  Quandary Peak).
- Each seed hike gets a synthetic elevation profile of ~20 points.
- Run `npm run db:seed` anytime you want to reset the seed hikes.

## Plan Generation (High-Level)

- Hikes are represented as profile points: `{ distanceMiles, elevationFt }`.
- Grades are calculated per segment and smoothed with a rolling average (window = 3).
- Grade is clamped to treadmill incline limits.
- Speed is derived from grade + fitness level (Beginner/Intermediate/Advanced),
  then adjusted for pack weight.
- Total duration is either Auto (distance + elevation + fitness) or manual.
- Segment times are allocated proportionally using an effort score.
- Warm-up (5 min) and cool-down (5 min) are always included.
- Training plan treadmill sessions reuse the plan generator and store per-segment
  prescriptions (minutes, incline, speed) with warm-up/cool-down included.

## Tests

```bash
npm run test
```
