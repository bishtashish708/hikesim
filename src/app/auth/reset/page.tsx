"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      setStatus("Check the console for your reset token.");
    } else {
      setStatus("Unable to request a reset. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Reset password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your email to receive a reset token.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          {status ? <p className="text-xs text-slate-600">{status}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Request reset
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-600">
          Already have a token?{" "}
          <Link href="/auth/reset/confirm" className="font-semibold text-emerald-700">
            Enter it here
          </Link>
        </p>
      </div>
    </div>
  );
}
