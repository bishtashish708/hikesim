"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type TabKey = "signup" | "signin";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;
  const callbackUrl = searchParams.get("callbackUrl") ?? "/hikes";
  const signupNotice = searchParams.get("signup") === "1";

  const [activeTab, setActiveTab] = useState<TabKey>(urlTab ?? "signup");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupCapsLock, setSignupCapsLock] = useState(false);
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinCapsLock, setSigninCapsLock] = useState(false);
  const [signinShowPassword, setSigninShowPassword] = useState(false);
  const [signinLoading, setSigninLoading] = useState(false);

  const signupEmailHint = useMemo(() => {
    if (!signupEmail) return null;
    return emailRegex.test(signupEmail) ? null : "Enter a valid email address.";
  }, [signupEmail]);

  const signupPasswordHint = useMemo(() => {
    if (!signupPassword) return null;
    return signupPassword.length >= 8 ? null : "Use at least 8 characters.";
  }, [signupPassword]);

  const handleTabChange = (nextTab: TabKey) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/?${params.toString()}`);
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setSignupError(data.error ?? "Unable to create account.");
      setSignupLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      email: signupEmail,
      password: signupPassword,
      callbackUrl: "/welcome",
    });

    if (result?.error) {
      setSignupError("Account created, but sign-in failed. Try logging in.");
      setSignupLoading(false);
      return;
    }

    window.location.href = result?.url ?? "/welcome";
  };

  const handleSignin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigninError(null);
    setSigninLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email: signinEmail,
      password: signinPassword,
      callbackUrl,
    });

    if (result?.error) {
      setSigninError("Invalid email or password.");
      setSigninLoading(false);
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
            HikeSim
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
            Turn a real hike into a treadmill-ready plan.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create an account or sign in to access the hike library and build your
            training schedule.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="rounded-full border border-slate-200 bg-slate-50 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("signup")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "signup"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("signin")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "signin"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
              </div>
            </div>

            {activeTab === "signup" ? (
              <form onSubmit={handleSignup} className="mt-6 flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                  Start with your name (optional), email, and password.
                </p>

                <div>
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Name (optional)
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    placeholder="you@example.com"
                    required
                  />
                  {signupEmailHint && (
                    <p className="mt-2 text-xs text-rose-600">{signupEmailHint}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Password
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="signup-password"
                      type={signupShowPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
                      onKeyUp={(event) =>
                        setSignupCapsLock(event.getModifierState("CapsLock"))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSignupShowPassword((prev) => !prev)}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                      aria-pressed={signupShowPassword}
                    >
                      {signupShowPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {signupCapsLock && (
                    <p className="mt-2 text-xs text-amber-600">Caps Lock is on.</p>
                  )}
                  {signupPasswordHint && (
                    <p className="mt-2 text-xs text-rose-600">{signupPasswordHint}</p>
                  )}
                </div>

                {signupError && (
                  <p className="text-xs font-semibold text-rose-600">{signupError}</p>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="mt-2 w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {signupLoading ? "Creating account..." : "Create Account"}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                  .
                </p>

                <div className="mt-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="h-px w-full bg-slate-200" />
                    or continue with
                    <span className="h-px w-full bg-slate-200" />
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mt-3 w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Continue with Google (coming soon)
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    We only use your name and email from social providers.
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignin} className="mt-6 flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                  Welcome back. Enter your email and password.
                </p>

                {signupNotice && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                    Account created. Please sign in to continue.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="signin-email"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={signinEmail}
                    onChange={(event) => setSigninEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="signin-password"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Password
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="signin-password"
                      type={signinShowPassword ? "text" : "password"}
                      value={signinPassword}
                      onChange={(event) => setSigninPassword(event.target.value)}
                      onKeyUp={(event) =>
                        setSigninCapsLock(event.getModifierState("CapsLock"))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      placeholder="Your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSigninShowPassword((prev) => !prev)}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
                      aria-pressed={signinShowPassword}
                    >
                      {signinShowPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {signinCapsLock && (
                    <p className="mt-2 text-xs text-amber-600">Caps Lock is on.</p>
                  )}
                </div>

                {signinError && (
                  <p className="text-xs font-semibold text-rose-600">{signinError}</p>
                )}

                <button
                  type="submit"
                  disabled={signinLoading}
                  className="mt-2 w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {signinLoading ? "Signing in..." : "Sign In"}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                  .
                </p>

                <div className="mt-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="h-px w-full bg-slate-200" />
                    or continue with
                    <span className="h-px w-full bg-slate-200" />
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mt-3 w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Continue with Google (coming soon)
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    We only use your name and email from social providers.
                  </p>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">What you get</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Curated hike library with elevation profiles.</li>
              <li>• Training plans tailored to your treadmill limits.</li>
              <li>• Saved progress so you can pick up where you left off.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              Your data stays private and is only used to personalize your training.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
