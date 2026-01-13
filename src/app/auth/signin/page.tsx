"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/lib/auth/callback";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const fallbackUrl = "/profile?onboarding=1";
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"), fallbackUrl);
  const authReason = searchParams.get("reason");
  const showDemoButton = process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS === "true";
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL ?? "";
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD ?? "";
  const autoDemo = searchParams.get("demo") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (response?.error === "EMAIL_NOT_VERIFIED") {
      setError("Please verify your email before signing in.");
      return;
    }
    if (response?.error) {
      setError("Unable to sign in.");
      return;
    }
    let destination = response?.url ?? callbackUrl;
    try {
      const profileResponse = await fetch("/api/profile");
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        const isComplete = Boolean(
          data.profile?.city &&
            data.profile?.state &&
            data.profile?.experience &&
            data.profile?.goalHikeId &&
            (data.preferences?.preferredDifficulty ||
              data.preferences?.preferredVolumeMinutes ||
              (data.preferences?.crossTrainingPreferences ?? []).length > 0)
        );
        if (!isComplete) {
          const encoded = encodeURIComponent(destination);
          window.location.href = `/profile?onboarding=1&callbackUrl=${encoded}`;
          return;
        }
        if (callbackUrl === fallbackUrl) {
          destination = "/dashboard";
        }
      }
    } catch {
      // Ignore profile check failures.
    }
    window.location.href = destination;
  };

  useEffect(() => {
    if (!autoDemo || !showDemoButton || !demoEmail || !demoPassword) return;
    signIn("credentials", {
      email: demoEmail,
      password: demoPassword,
      redirect: true,
      callbackUrl,
    });
  }, [autoDemo, showDemoButton, demoEmail, demoPassword, callbackUrl]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use your email and password or continue with Google.
        </p>
        {authReason === "auth_required" ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            An account is required to continue. Sign in or create an account to proceed.
          </p>
        ) : null}
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
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Continue with Google
        </button>
        {showDemoButton ? (
          <button
            type="button"
            onClick={() =>
              signIn("credentials", {
                email: demoEmail,
                password: demoPassword,
                redirect: true,
                callbackUrl,
              })
            }
            className="mt-3 w-full rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
          >
            Log in as Demo User
          </button>
        ) : null}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <Link
            href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-emerald-700"
          >
            Create account
          </Link>
          <Link href="/auth/reset" className="font-semibold text-slate-500">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
