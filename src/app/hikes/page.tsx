import Link from "next/link";
import HikesList from "@/components/HikesList";

export default function HikesPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
                HikeSim
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
                Turn a real hike into a treadmill-ready training plan.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Pick a hike, tune the treadmill constraints, and generate a time-based
                incline + speed plan with warm-up and cool-down baked in.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/hikes/new"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  Create Custom Hike
                </Link>
                <Link
                  href="/preview"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  Preview plan
                </Link>
              </div>
            </div>
            <Link
              href="/hikes/new"
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Create Custom Hike
            </Link>
          </div>
        </header>

        <HikesList />
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
