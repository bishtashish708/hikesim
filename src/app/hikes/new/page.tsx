import Link from "next/link";
import { CustomHikeForm } from "@/components/CustomHikeForm";

export default function NewHikePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Link href="/hikes" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to hikes
        </Link>
        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Create a custom hike</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter distance and elevation gain. HikeSim will synthesize a realistic
            profile and let you generate a treadmill plan.
          </p>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CustomHikeForm />
        </section>
      </main>
    </div>
  );
}
