"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/lib/auth/callback";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(
    searchParams.get("callbackUrl"),
    "/profile?onboarding=1"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data?.error ?? "Unable to create account.");
      return;
    }
    setStatus("Account created. Redirecting to email verification.");
    const encoded = encodeURIComponent(callbackUrl);
    window.location.href = `/auth/verify?callbackUrl=${encoded}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-sm text-slate-600">
          We’ll send a verification link before you sign in.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
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
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Password (min 8 chars)
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
            Create account
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-600">
          Already have an account?{" "}
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
