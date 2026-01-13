import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const showDemoButton = process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS === "true";
  const hikes = await prisma.hike.findMany({
    orderBy: { name: "asc" },
  });
  const createCustomHref = session
    ? "/hikes/new"
    : `/auth/signup?callbackUrl=${encodeURIComponent("/hikes/new")}`;

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
              <p className="mt-2 max-w-2xl text-xs text-slate-500">
                Create a free account to save your progress, personalize training, and sync plans.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {session ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      Go to dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
                    >
                      Edit profile
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/auth/signup?callbackUrl=${encodeURIComponent("/")}`}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      Get started for free
                    </Link>
                    <Link
                      href="/auth/signin"
                      className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
                    >
                      Sign in
                    </Link>
                    {showDemoButton ? (
                      <Link
                        href={`/auth/signin?demo=1&callbackUrl=${encodeURIComponent("/")}`}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Log in as Demo User
                      </Link>
                    ) : null}
                    <Link
                      href="/preview"
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                    >
                      Preview plan
                    </Link>
                  </>
                )}
              </div>
            </div>
            <Link
              href={createCustomHref}
              className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${
                session
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"
              }`}
            >
              {session ? "Create Custom Hike" : "Create Custom Hike (sign in required)"}
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hikes.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              No hikes yet. Run the seed script or add a custom hike to get started.
            </div>
          ) : (
            hikes.map((hike) => (
              <Link
                key={hike.id}
                href={
                  session
                    ? `/hikes/${hike.id}`
                    : `/auth/signin?callbackUrl=${encodeURIComponent(`/hikes/${hike.id}`)}&reason=auth_required`
                }
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700">
                  {hike.name}
                </h2>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>{hike.distanceMiles.toFixed(1)} mi</span>
                  <span>{hike.elevationGainFt.toLocaleString()} ft gain</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Synthetic elevation profile • Ready for planning
                </p>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
