"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

type HikeListItem = {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  parkName: string | null;
  difficulty?: string;
  trailType?: string;
};

export default function HikesList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<HikeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parks, setParks] = useState<string[]>([]);
  const [selectedPark, setSelectedPark] = useState<string>("");

  const parkParam = searchParams.get("park") ?? "";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (parkParam) params.set("park", parkParam);
    return params.toString();
  }, [parkParam]);

  // Load parks list
  useEffect(() => {
    const loadParks = async () => {
      try {
        const response = await fetch("/api/geo/parks");
        if (!response.ok) {
          setParks([]);
          return;
        }
        const data = await response.json();
        setParks(data.parks ?? []);
      } catch (err) {
        console.error("Failed to load parks:", err);
        setParks([]);
      }
    };
    loadParks();
  }, []);

  // Load hikes
  useEffect(() => {
    let isMounted = true;
    const fetchHikes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const endpoint = `/api/hikes/by-park?${query}`;
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error("Unable to load hikes.");
        }
        const data = await response.json();
        if (isMounted) {
          setItems(data.items ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load hikes for this park.");
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

  // Handle park selection
  const handleParkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const park = e.target.value;
    setSelectedPark(park);
    if (park) {
      router.push(`/hikes?park=${encodeURIComponent(park)}`);
    } else {
      router.push("/hikes");
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="flex gap-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`hike-skeleton-${index}`}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
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
    <section className="space-y-6">
      {/* Park Filter */}
      <div className="flex gap-4 items-center">
        <label htmlFor="park-filter" className="text-sm font-medium text-slate-700">
          Filter by National Park:
        </label>
        <select
          id="park-filter"
          value={selectedPark || parkParam}
          onChange={handleParkChange}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">All National Parks ({items.length} trails)</option>
          {parks.map((park) => (
            <option key={park} value={park}>
              {park}
            </option>
          ))}
        </select>
      </div>

      {/* Hikes Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No hikes found for this park. Try selecting a different park or view all trails.
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
                {hike.parkName || "US National Parks"}
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                <span>{hike.distanceMiles.toFixed(1)} mi</span>
                <span>•</span>
                <span>{hike.elevationGainFt.toLocaleString()} ft</span>
                {hike.difficulty && (
                  <>
                    <span>•</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {hike.difficulty}
                    </span>
                  </>
                )}
              </div>
              {hike.trailType && (
                <p className="mt-2 text-xs text-slate-500">
                  {hike.trailType}
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
