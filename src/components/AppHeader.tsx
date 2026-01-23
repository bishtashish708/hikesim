"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const homeHref = user ? "/dashboard" : "/";

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm">
        <div className="flex items-center gap-8">
          <Link
            href={homeHref}
            className="text-base font-bold uppercase tracking-[0.15em] text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            HikeSim
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/hikes"
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  isActive('/hikes')
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Hikes
              </Link>
              <Link
                href="/training-plans"
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  isActive('/training-plans')
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                My Plans
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-gray-600 hidden sm:inline">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && (
        <nav className="md:hidden border-t border-gray-200 px-6 py-2 flex items-center gap-1 overflow-x-auto">
          <Link
            href="/dashboard"
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              isActive('/dashboard')
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/hikes"
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              isActive('/hikes')
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Hikes
          </Link>
          <Link
            href="/training-plans"
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              isActive('/training-plans')
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            My Plans
          </Link>
        </nav>
      )}
    </header>
  );
}
