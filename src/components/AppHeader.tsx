"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AppHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const homeHref = user ? "/hikes" : "/";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-slate-700">
        <Link
          href={homeHref}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600"
        >
          HikeSim
        </Link>
        {user ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </header>
  );
}
