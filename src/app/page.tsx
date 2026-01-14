"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setFormError(data.error ?? "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    setFormError(null);
    setIsSubmitting(false);
    setPassword("");
    router.push("/login?signup=1");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
                HikeSim
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
                Create an account to unlock your training plan.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Sign up to access the hike library, generate plans, and save your
                progress.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-xs text-emerald-700 shadow-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold underline">
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Start with a name, email, and password. You&apos;ll be ready to explore
              hikes in minutes.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-600">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">What you get</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Curated hike library with elevation profiles.</li>
              <li>• Training plans tailored to your treadmill limits.</li>
              <li>• Saved progress so you can pick up where you left off.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              Prefer to explore later? You can always sign in once your account is set up.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
