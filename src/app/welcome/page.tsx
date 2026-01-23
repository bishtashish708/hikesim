"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          const profileExists = data.profile !== null;
          setHasProfile(profileExists);
          setShowOnboarding(!profileExists);
        } else {
          setHasProfile(false);
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setHasProfile(false);
        setShowOnboarding(true);
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [status]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasProfile(true);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    router.push("/");
    return null;
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
              Welcome to HikeSim
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Let's get you started!
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Answer a few quick questions to personalize your training experience.
            </p>
          </header>

          <OnboardingWizard
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        </main>
      </div>
    );
  }

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
            href="/dashboard"
            className="mt-5 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Go to Dashboard
          </Link>
        </section>
      </main>
    </div>
  );
}
