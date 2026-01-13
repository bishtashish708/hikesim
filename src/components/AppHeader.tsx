"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import SignOutButton from "@/components/SignOutButton";

export default function AppHeader() {
  const { data: session } = useSession();
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Account";
  const showDemoBanner = process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS === "true";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-slate-700">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          HikeSim
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
              >
                {userLabel}
              </Link>
              <SignOutButton className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500" />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      {showDemoBanner ? (
        <div className="border-t border-amber-100 bg-amber-50 px-6 py-2 text-xs text-amber-700">
          Demo mode enabled. Use the seeded demo accounts for quick testing.
        </div>
      ) : null}
    </header>
  );
}
