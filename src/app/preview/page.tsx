import { prisma } from "@/lib/db";
import { buildTrainingPlan } from "@/lib/training/buildTrainingPlan";
import type { ProfilePoint } from "@/lib/planGenerator";

const fallbackHike = {
  id: "preview-hike",
  name: "Preview Hike",
  distanceMiles: 6.5,
  elevationGainFt: 1800,
  profilePoints: [
    { distanceMiles: 0, elevationFt: 0 },
    { distanceMiles: 1.5, elevationFt: 500 },
    { distanceMiles: 3.2, elevationFt: 1200 },
    { distanceMiles: 4.8, elevationFt: 1600 },
    { distanceMiles: 6.5, elevationFt: 1800 },
  ],
};

export default async function PreviewPlanPage() {
  const hike = (await prisma.hike.findFirst({ orderBy: { name: "asc" } })) ?? fallbackHike;
  const trainingStart = new Date();
  const target = new Date();
  target.setDate(target.getDate() + 42);
  const plan = buildTrainingPlan({
    hike: {
      distanceMiles: hike.distanceMiles,
      elevationGainFt: hike.elevationGainFt,
      profilePoints: hike.profilePoints as ProfilePoint[],
    },
    fitnessLevel: "Beginner",
    targetDate: target.toISOString().slice(0, 10),
    trainingStartDate: trainingStart.toISOString().slice(0, 10),
    daysPerWeek: 5,
    preferredDays: [],
    anyDays: true,
    baselineMinutes: 0,
    constraints: {
      treadmillMaxInclinePercent: 12,
      treadmillSessionsPerWeek: 3,
      outdoorHikesPerWeek: 1,
      maxSpeedMph: 4.5,
    },
    strengthSessionsPerWeek: 2,
    includeStrength: true,
    strengthOnCardioDays: false,
    fillActiveRecoveryDays: true,
  });

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Preview training plan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Explore a sample week-by-week plan before generating your own.
          </p>
        </header>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          Preview mode: saving, exporting, and editing are disabled.
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            {plan.totalWeeks} weeks • {plan.summary.daysPerWeek} days/week •{" "}
            {plan.summary.averageWeeklyMinutes} min/week
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sample based on {hike.name} ({hike.distanceMiles.toFixed(1)} mi ·{" "}
            {hike.elevationGainFt.toLocaleString()} ft gain).
          </p>
        </section>

        <section className="grid gap-4">
          {plan.weeks.slice(0, 2).map((week) => (
            <div key={week.weekNumber} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Week {week.weekNumber}</h2>
                <p className="text-xs text-slate-500">{week.focus}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {week.days.map((day) => (
                  <div key={day.date} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">{day.dayName}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {day.workouts.map((workout) => (
                        <li key={workout.id}>
                          {workout.type} • {workout.durationMinutes} min
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
