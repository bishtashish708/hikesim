import Link from "next/link";
import { notFound } from "next/navigation";
import { ElevationChart } from "@/components/ElevationChart";
import { TrainingPlanBuilder } from "@/components/TrainingPlanBuilder";
import { prisma } from "@/lib/db";
import type { ProfilePoint } from "@/lib/planGenerator";

type HikeDetailPageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function HikeDetailPage({ params }: HikeDetailPageProps) {
  const { id } = await Promise.resolve(params);
  if (!id) {
    notFound();
  }
  const hike = await prisma.hike.findUnique({
    where: { id },
  });

  if (!hike) {
    notFound();
  }

  const profilePoints = hike.profilePoints as unknown as ProfilePoint[];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Link href="/hikes" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to hikes
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{hike.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {hike.distanceMiles.toFixed(1)} miles •{" "}
                {hike.elevationGainFt.toLocaleString()} ft gain
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Profile points: {profilePoints.length}
            </div>
          </div>
        </header>

        <section className="grid gap-6">
          <ElevationChart points={profilePoints} />
        </section>

        <TrainingPlanBuilder
          hike={{
            id: hike.id,
            name: hike.name,
            distanceMiles: hike.distanceMiles,
            elevationGainFt: hike.elevationGainFt,
            profilePoints,
          }}
          fitnessLevel="Intermediate"
        />
      </main>
    </div>
  );
}
