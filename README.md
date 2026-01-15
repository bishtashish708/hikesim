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



## Trail Data

HikeSim ships with preloaded trails for the US and India. The dataset is generated
from Wikidata and stored locally so the app is not dependent on live scraping.

Update the dataset and reseed:

```bash
npm run trails:fetch
npm run db:seed
```

Data file: `data/trails/preloaded.json`.

## Seed Data

- Seed hikes live in `prisma/seed.ts` and include 8–10 popular hikes (including
  Quandary Peak).
- Each seed hike gets a synthetic elevation profile of ~20 points.
- Run `npm run db:seed` anytime you want to reset the seed hikes.

## Development Login

When running locally, the seed script creates a demo user you can use to sign in:



Do not use these credentials in production.

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

## iOS App (Expo)

The iOS/Android prototype lives in `IOS hiking app`.

Run it locally:

```bash
cd "IOS hiking app"
npm install
npx expo start
```

Install Expo Go on your phone and scan the QR code (same Wi-Fi).

## App Details

See `App details.md` for the web app, and `IOS hiking app/App details.md` for the
mobile prototype.

## Tests

```bash
npm run test
```
