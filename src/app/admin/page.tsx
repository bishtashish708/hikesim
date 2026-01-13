"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminBypassPage() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/bypass")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.enabled) {
          setEnabled(true);
        }
      })
      .catch(() => {
        // Ignore status check errors.
      });
  }, []);

  const updateBypass = async (nextValue: boolean) => {
    setStatus(null);
    const response = await fetch("/api/admin/bypass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextValue }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Admin bypass is disabled in this environment.");
      return;
    }
    setEnabled(nextValue);
    setStatus(nextValue ? "Admin bypass enabled." : "Admin bypass disabled.");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Admin access (dev bypass)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enable this to bypass authentication while testing plan generation locally.
          </p>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => updateBypass(true)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Enable bypass
            </button>
            <button
              type="button"
              onClick={() => updateBypass(false)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              Disable bypass
            </button>
            <span className="text-xs text-slate-500">
              Status: {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {status ? <p className="mt-2 text-xs text-emerald-700">{status}</p> : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Quick links</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              Landing page
            </Link>
            <Link
              href="/hikes/new"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              Create custom hike
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              Dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
