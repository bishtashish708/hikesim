import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-slate-700">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          HikeSim
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/hikes/new"
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Create Custom Hike
          </Link>
        </div>
      </div>
    </header>
  );
}
