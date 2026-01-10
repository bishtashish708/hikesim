## Copilot instructions — HikeSim

Quick start
- Install dependencies: `npm install`
- Prepare DB (SQLite configured via `DATABASE_URL`): `npm run db:push` then `npm run db:seed`
- Run dev server: `npm run dev` (Next.js app router in `src/app`)
- Run tests: `npm run test` (Vitest)

Big picture (where to look)
- Entry/UI: `src/app` (Next 16 app router) and `src/components` for React UI.
- Domain logic: `src/lib` — primary files:
  - `src/lib/planGenerator.ts` — generates treadmill segments (warm-up/cool-down included), smoothing, rounding and speed/incline computation.
  - `src/lib/training/trainingPlan.ts` — builds multi-week training plans (weeks, days, workouts) and composes the plan generator output.
  - `src/lib/formatters.ts` — `roundToStep()` and display helpers; used widely for consistent rounding.
  - `src/lib/db.ts` — Prisma client instance (singleton pattern for dev hot-reload).
- API routes: `src/app/api/*/route.ts` (server actions use `prisma` and simple validation; see `src/app/api/hikes/route.ts`).
- Database schema & seeds: `prisma/schema.prisma` (SQLite) and `prisma/seed.js` (seed hikes).

Project-specific conventions & patterns
- Keep business logic in `src/lib` (pure functions, exported types). UI components call these via API or props.
- Types-first: many files export explicit TypeScript types (e.g., `PlanSegment`, `FitnessLevel`). Prefer reusing those exported types.
- Rounding & units: use `roundToStep()`; inclines are percent, speeds are mph, durations in minutes. Warm-up is `segment: 0`, cool-down is final segment.
- Plan generator expectations: functions accept `profilePoints` arrays of `{ distanceMiles, elevationFt }` and return segments with minutes, inclinePercent, speedMph.
- Tests live next to domain code: `src/lib/*.test.ts` and `src/lib/training/*.test.ts` — update these when changing generator or training logic.

Developer workflows & commands
- Dev server: `npm run dev` (Next handles hot reload)
- Build & start (production preview): `npm run build` then `npm run start`
- Prisma: `npm run db:push` to sync schema, `npm run db:seed` to seed. You can run Prisma CLI directly (package.json exposes `prisma`).
- Tests: `npm run test` (Vitest). Unit tests target `src/lib` logic.

Integration & debugging notes
- DB: uses SQLite by default (see `prisma/schema.prisma`); ensure `DATABASE_URL` points to a writable SQLite file in env when running elsewhere.
- Prisma client: `src/lib/db.ts` uses a global singleton to avoid multiple clients during hot reload — do not replace it with a new PrismaClient per import.
- When modifying generation logic, update rounding/formatting in `src/lib/formatters.ts` and corresponding tests.
- API handlers perform minimal validation and construct profile points server-side (see `buildProfile` in `src/app/api/hikes/route.ts`).

Editor/PR guidance for AI edits
- Favor modifying `src/lib` for behavior changes and `src/components` for presentation. Keep API route signatures stable.
- Run `npm run test` after changes that affect `src/lib` to catch regressions.
- If adding DB-backed features, update `prisma/schema.prisma` and include a migration/seed change; prefer `npm run db:push` + `npm run db:seed` for local dev.

If anything's unclear or you'd like more examples (e.g., a walkthrough for adding a new workout type), tell me which area to expand.
