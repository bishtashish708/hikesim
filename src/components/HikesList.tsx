"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApiBase } from "@/lib/apiBase";

type HikeListItem = {
  id: number;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  isSeed: boolean;
  countryName: string;
  stateName: string | null;
};

type Option = { code: string; name: string };

export default function HikesList() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<HikeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const apiBase = getApiBase();
  const useBackend = Boolean(apiBase);

  const countryParam = searchParams.get("country") ?? "";
  const stateParam = searchParams.get("state") ?? "";
  const selectedCountry = countryParam || "US";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCountry) params.set("country", selectedCountry);
    if (stateParam) params.set("state", stateParam);
    return params.toString();
  }, [selectedCountry, stateParam]);

  useEffect(() => {
    let isMounted = true;
    const fetchHikes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const endpointBase = apiBase ? apiBase : "";
        const endpoint = useBackend ? `${endpointBase}/trails?${query}` : `/api/hikes/list?${query}`;
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error("Unable to load hikes.");
        }
        const data = await response.json();
        if (isMounted) {
          const nextItems = (data.items ?? []).map((item: any) => {
            const countryCode = item.countryCode ?? item.country_code ?? "";
            const stateCode = item.stateCode ?? item.state_code ?? "";
            const countryName =
              countries.find((country) => country.code === countryCode)?.name ?? countryCode;
            const stateName = stateCode
              ? states.find((state) => state.code === stateCode)?.name ?? stateCode
              : null;
            return {
              id: item.id,
              name: item.name,
              distanceMiles: item.distanceMiles ?? item.distance_miles ?? 0,
              elevationGainFt: item.elevationGainFt ?? item.elevation_gain_ft ?? 0,
              isSeed: item.isSeed ?? item.is_seed ?? false,
              countryName,
              stateName,
            };
          });
          setItems(nextItems);
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
  }, [apiBase, countries, countryParam, query, selectedCountry, states, useBackend]);

  useEffect(() => {
    const loadCountries = async () => {
      const response = await fetch("/api/geo/countries");
      if (!response.ok) {
        setCountries([]);
        return;
      }
      const data = await response.json();
      setCountries(data.countries ?? []);
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      if (!selectedCountry) {
        setStates([]);
        return;
      }
      const response = await fetch(`/api/geo/states?country=${selectedCountry}`);
      if (!response.ok) {
        setStates([]);
        return;
      }
      const data = await response.json();
      setStates(data.states ?? []);
    };
    loadStates();
  }, [selectedCountry]);

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
