"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetConfirmPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    const response = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data?.error ?? "Unable to reset password.");
      return;
    }
    setStatus("Password reset. You can sign in now.");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Enter reset token</h1>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Reset token
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Reset password
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-600">
          <Link href="/auth/signin" className="font-semibold text-emerald-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
