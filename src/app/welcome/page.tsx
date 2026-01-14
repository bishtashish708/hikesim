import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
            Welcome to HikeSim
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Your account is ready.
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pick your first hike and we&apos;ll build a treadmill-ready training plan.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. Browse the hike library and select a goal hike.</li>
            <li>2. Set your treadmill constraints and training days.</li>
            <li>3. Generate your weekly training schedule.</li>
          </ul>
          <Link
            href="/hikes"
            className="mt-5 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Pick a hike
          </Link>
        </section>
      </main>
    </div>
  );
}
