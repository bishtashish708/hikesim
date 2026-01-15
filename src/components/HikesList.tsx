"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type HikeListItem = {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  isSeed: boolean;
  countryName: string;
  stateName: string | null;
};

export default function HikesList() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<HikeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const countryParam = searchParams.get("country") ?? "";
  const stateParam = searchParams.get("state") ?? "";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (countryParam) params.set("country", countryParam);
    if (stateParam) params.set("state", stateParam);
    return params.toString();
  }, [countryParam, stateParam]);

  useEffect(() => {
    let isMounted = true;
    const fetchHikes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/hikes/list?${query}`);
        if (!response.ok) {
          throw new Error("Unable to load hikes.");
        }
        const data = await response.json();
        if (isMounted) {
          setItems(data.items ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load hikes for this region.");
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchHikes();
    return () => {
      isMounted = false;
    };
  }, [query]);

  if (isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`hike-skeleton-${index}`}
            className="h-28 rounded-2xl border border-slate-200 bg-slate-50"
          />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.length === 0 ? (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          No hikes found for this region yet. Try another state or import trails.
        </div>
      ) : (
        items.map((hike) => (
          <Link
            key={hike.id}
            href={`/hikes/${hike.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700">
              {hike.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {hike.stateName ? `${hike.stateName}, ` : ""}
              {hike.countryName}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                {hike.distanceMiles > 0
                  ? `${hike.distanceMiles.toFixed(1)} mi`
                  : "Distance TBD"}
              </span>
              <span>
                {hike.elevationGainFt > 0
                  ? `${hike.elevationGainFt.toLocaleString()} ft gain`
                  : "Elevation TBD"}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {hike.isSeed ? "Seeded trail profile" : "Imported trail profile"}
            </p>
          </Link>
        ))
      )}
    </section>
  );
}
