import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanExportButton } from "@/components/PlanExportButton";
import { prisma } from "@/lib/db";
import type { PlanSegment, PlanSettings } from "@/lib/planGenerator";

type PlanPageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function PlanPage({ params }: PlanPageProps) {
  const { id } = await Promise.resolve(params);
  if (!id) {
    notFound();
  }
  const plan = await prisma.generatedPlan.findUnique({
    where: { id },
    include: { hike: true },
  });

  if (!plan) {
    notFound();
  }

  const settings = plan.settings as PlanSettings & { totalMinutes?: number };
  const segments = plan.segments as PlanSegment[];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Link
          href={`/hikes/${plan.hikeId}`}
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back to hike
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{plan.hike.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {plan.hike.distanceMiles.toFixed(1)} miles •{" "}
                {plan.hike.elevationGainFt.toLocaleString()} ft gain
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Fitness level: {settings.fitnessLevel} • Total time{" "}
                {settings.totalMinutes ?? "auto"} min
              </p>
            </div>
            <PlanExportButton hikeName={plan.hike.name} segments={segments} />
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Segment</th>
                  <th className="py-3 pr-4">Minutes</th>
                  <th className="py-3 pr-4">Incline %</th>
                  <th className="py-3 pr-4">Speed (mph)</th>
                  <th className="py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment) => (
                  <tr key={`${segment.segment}-${segment.minutes}`} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-700">
                      {segment.segment === 0 ? "Warm-up" : segment.segment}
                    </td>
                    <td className="py-3 pr-4">{segment.minutes}</td>
                    <td className="py-3 pr-4">{segment.inclinePercent}</td>
                    <td className="py-3 pr-4">{segment.speedMph}</td>
                    <td className="py-3 text-slate-600">{segment.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
