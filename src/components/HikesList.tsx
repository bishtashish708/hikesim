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
  stateCode: string | null;
  countryCode: string;
  region: string | null;
  difficulty?: string;
  trailType?: string;
};

type Country = { code: string; name: string; count: number };
type Region = { code?: string; name: string; count?: number } | string;

export default function HikesList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<HikeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const countryParam = searchParams.get("country") ?? "";
  const regionsParam = searchParams.get("regions") ?? "";

  // Load countries
  useEffect(() => {
    fetch("/api/geo/countries")
      .then((res) => res.json())
      .then((data) => setCountries(data.countries ?? []))
      .catch(() => setCountries([]));
  }, []);

  // Load regions when country changes
  useEffect(() => {
    if (!countryParam) {
      setRegions([]);
      return;
    }

    fetch(`/api/geo/regions?country=${countryParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.type === "states") {
          setRegions(data.regions || []);
        } else {
          setRegions(data.regions || []);
        }
      })
      .catch(() => setRegions([]));
  }, [countryParam]);

  // Load hikes
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (countryParam) params.set("country", countryParam);
    if (regionsParam) params.set("region", regionsParam);
    params.set("page", page.toString());
    params.set("limit", "500");
    return params.toString();
  }, [countryParam, regionsParam, page]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/hikes/by-region?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
          setHasMore(data.hasMore ?? false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Unable to load hikes.");
          setItems([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [query]);

  useEffect(() => setPage(1), [countryParam, regionsParam]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);

    if (country) {
      router.push(`/hikes?country=${country}`);
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
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
      {/* Hierarchical Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <label className="text-sm font-medium text-slate-700">Country:</label>
        <select
          value={selectedCountry || countryParam}
          onChange={handleCountryChange}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">All Countries ({total} trails)</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.count} trails)
            </option>
          ))}
        </select>

        {countryParam && regions.length > 0 && (
          <>
            <label className="text-sm font-medium text-slate-700">
              {countryParam === "US" ? "Parks:" : "States:"}
            </label>
            <select
              value={regionsParam}
              onChange={(e) => {
                const val = e.target.value;
                router.push(val ? `/hikes?country=${countryParam}&regions=${val}` : `/hikes?country=${countryParam}`);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">All {countryParam === "US" ? "Parks" : "States"}</option>
              {regions.map((r) => {
                const value = typeof r === "string" ? r : r.code || r.name;
                const label = typeof r === "string" ? r : r.name;
                const count = typeof r === "object" && r.count ? ` (${r.count})` : "";
                return (
                  <option key={value} value={value}>
                    {label}{count}
                  </option>
                );
              })}
            </select>
          </>
        )}

        {items.length > 0 && (
          <div className="text-sm text-slate-600">
            Showing {items.length} of {total} trails
          </div>
        )}
      </div>

      {/* Hikes Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No hikes found. Try selecting different filters.
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
                {hike.parkName || hike.region || (hike.countryCode === "IN" ? "India" : "USA")}
                {hike.countryCode === "IN" && hike.stateCode && ` - ${hike.stateCode === "UK" ? "Uttarakhand" : "Himachal Pradesh"}`}
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
                <p className="mt-2 text-xs text-slate-500">{hike.trailType}</p>
              )}
            </Link>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Load More Trails
          </button>
        </div>
      )}
    </section>
  );
}
