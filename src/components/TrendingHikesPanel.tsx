"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type TrendingHike = {
  id: string;
  name: string;
  country: string;
  state: string | null;
  countryCode: string;
  stateCode: string | null;
  difficulty: string;
  distanceMiles: number;
  elevationGainFt: number;
  rating: number;
  reviews: number;
  popularityScore: number;
  rank: number;
};

type Option = { code: string; name: string };

const storageKey = "hikes:country";
const statesStorageKey = "hikes:states";
const preloadStoragePrefix = "hikes:preloaded:";
const DEFAULT_COUNTRY = "US";

export default function TrendingHikesPanel() {
  const [country, setCountry] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState("");
  const [countries, setCountries] = useState<Option[]>([]);
  const [availableStates, setAvailableStates] = useState<Option[]>([]);
  const [items, setItems] = useState<TrendingHike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [page, setPage] = useState(1);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);
  const importAttemptsRef = useRef(new Set<string>());
  const [importStatus, setImportStatus] = useState<{
    message: string;
    progress: number;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCountry = country ?? DEFAULT_COUNTRY;

  const fetchTrending = useCallback(async (params: URLSearchParams, append = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/hikes/trending?${params.toString()}`);
      if (!response.ok) {
        setError("Unable to load trending hikes.");
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []));
      setHasMore(Boolean(data.hasMore));
      setCountry(data.countryCode ?? DEFAULT_COUNTRY);
      setStateCode(Array.isArray(data.states) ? data.states[0] ?? "" : "");
      setIsInitialFetchDone(true);
      setIsLoading(false);
    } catch (err) {
      setError("Unable to load trending hikes.");
      setIsLoading(false);
    }
  }, []);

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
        setAvailableStates([]);
        return;
      }
      const response = await fetch(`/api/geo/states?country=${selectedCountry}`);
      if (!response.ok) {
        setAvailableStates([]);
        return;
      }
      const data = await response.json();
      setAvailableStates(data.states ?? []);
    };
    loadStates();
  }, [selectedCountry]);

  useEffect(() => {
    if (isInitialFetchDone) {
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    const storedState = window.localStorage.getItem(statesStorageKey);
    if (stored) {
      setCountry(stored);
      setStateCode(storedState ?? "");
      setShowLocationPrompt(false);
      const params = new URLSearchParams({ country: stored, page: "1" });
      if (storedState) {
        params.set("states", storedState);
      }
      setPage(1);
      fetchTrending(params);
      const urlParams = new URLSearchParams(searchParams.toString());
      urlParams.set("country", stored);
      if (storedState) {
        urlParams.set("state", storedState);
      } else {
        urlParams.delete("state");
      }
      router.replace(`/hikes?${urlParams.toString()}`);
      router.refresh();
      return;
    }
    const params = new URLSearchParams({ country: DEFAULT_COUNTRY, page: "1" });
    setPage(1);
    fetchTrending(params);
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.set("country", DEFAULT_COUNTRY);
    urlParams.delete("state");
    router.replace(`/hikes?${urlParams.toString()}`);
    router.refresh();
  }, [fetchTrending, isInitialFetchDone]);

  useEffect(() => {
    if (isLoading || items.length > 0) {
      return;
    }
    const preloadKey = `${preloadStoragePrefix}${selectedCountry}`;
    const hasPreloaded = window.localStorage.getItem(preloadKey);
    if (hasPreloaded) {
      return;
    }
    if (importAttemptsRef.current.has(preloadKey)) {
      return;
    }
    importAttemptsRef.current.add(preloadKey);
    const runImport = async () => {
      setIsLoading(true);
      setError(null);
      setImportStatus({
        message: "Preloading protected-area trails for this country…",
        progress: 30,
      });
      const response = await fetch("/api/hikes/import-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: selectedCountry,
          limitPerState: 15,
        }),
      });
      if (!response.ok) {
        setError("Unable to load trending hikes.");
        setIsLoading(false);
        setImportStatus(null);
        return;
      }
      setImportStatus({ message: "Processing protected trails…", progress: 70 });
      const result = await response.json();
      window.localStorage.setItem(preloadKey, "1");
      const params = new URLSearchParams({ page: "1" });
      if (country) {
        params.set("country", country);
      }
      if (stateCode) {
        params.set("states", stateCode);
      }
      setPage(1);
      fetchTrending(params);
      const importedCount = result?.imported ?? 0;
      setImportStatus({
        message: `Imported ${importedCount} hikes across protected areas.`,
        progress: 100,
      });
      setTimeout(() => setImportStatus(null), 2500);
    };
    runImport();
  }, [country, error, fetchTrending, isLoading, items.length, selectedCountry, stateCode]);

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setStateCode("");
    window.localStorage.setItem(storageKey, value);
    window.localStorage.removeItem(statesStorageKey);
    const params = new URLSearchParams({ country: value, page: "1" });
    setPage(1);
    fetchTrending(params);
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.set("country", value);
    urlParams.delete("state");
    router.replace(`/hikes?${urlParams.toString()}`);
    router.refresh();
  };

  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    setStateCode(selected);
    if (selected) {
      window.localStorage.setItem(statesStorageKey, selected);
    } else {
      window.localStorage.removeItem(statesStorageKey);
    }
    const params = new URLSearchParams({ page: "1" });
    if (country) {
      params.set("country", country);
    }
    if (selected) {
      params.set("states", selected);
    }
    setPage(1);
    fetchTrending(params);
    const urlParams = new URLSearchParams(searchParams.toString());
    if (country) {
      urlParams.set("country", country);
    }
    if (selected) {
      urlParams.set("state", selected);
    } else {
      urlParams.delete("state");
    }
    router.replace(`/hikes?${urlParams.toString()}`);
    router.refresh();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(1));
        const lon = Number(position.coords.longitude.toFixed(1));
        const geoParams = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
        });
        const geoResponse = await fetch(`/api/geo/region?${geoParams.toString()}`);

        if (geoResponse.ok) {
          const data = await geoResponse.json();
          const nextCountry = data.countryCode ?? DEFAULT_COUNTRY;
          const nextState = data.stateCode ?? "";
          window.localStorage.setItem(storageKey, nextCountry);
          if (nextState) {
            window.localStorage.setItem(statesStorageKey, nextState);
          } else {
            window.localStorage.removeItem(statesStorageKey);
          }
          setCountry(nextCountry);
          setStateCode(nextState);
          const params = new URLSearchParams({ country: nextCountry, page: "1" });
          if (nextState) {
            params.set("states", nextState);
          }
          setPage(1);
          setShowLocationPrompt(false);
          fetchTrending(params);
          const urlParams = new URLSearchParams(searchParams.toString());
          urlParams.set("country", nextCountry);
          if (nextState) {
            urlParams.set("state", nextState);
          } else {
            urlParams.delete("state");
          }
          router.replace(`/hikes?${urlParams.toString()}`);
          router.refresh();
          return;
        }

        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          page: "1",
        });
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(statesStorageKey);
        setPage(1);
        setShowLocationPrompt(false);
        fetchTrending(params);
      },
      () => {
        setError("We could not access your location. Choose a region instead.");
        setShowLocationPrompt(false);
      }
    );
  };

  const detailLabel = useMemo(() => {
    const countryName = countries.find((item) => item.code === selectedCountry)?.name;
    const stateName = stateCode
      ? availableStates.find((item) => item.code === stateCode)?.name ?? stateCode
      : "";
    const stateLabel = stateName ? ` · ${stateName}` : "";
    return countryName ? `Trending in ${countryName}${stateLabel}` : "Trending hikes";
  }, [availableStates, countries, selectedCountry, stateCode]);

  const loadMore = () => {
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage) });
    if (country) {
      params.set("country", country);
    }
    if (stateCode) {
      params.set("states", stateCode);
    }
    setPage(nextPage);
    fetchTrending(params, true);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
            Trending hikes
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{detailLabel}</h2>
          <p className="mt-1 text-xs text-slate-500">
            <span className="mr-2">📍</span>
            We only use your city or region to recommend nearby hikes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Country
          </label>
          <select
            value={selectedCountry}
            onChange={(event) => handleCountryChange(event.target.value)}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {countries.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            State
          </label>
          <div className="flex items-center gap-2">
            <select
              value={stateCode}
              onChange={handleStateChange}
              disabled={availableStates.length === 0}
              className="min-w-[220px] rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:bg-slate-50"
            >
              {availableStates.length === 0 ? (
                <option value="">All</option>
              ) : (
                <>
                  <option value="">All</option>
                  {availableStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button
              type="button"
              onClick={() => {
                setStateCode("");
                window.localStorage.removeItem(statesStorageKey);
                const params = new URLSearchParams({ page: "1" });
                if (country) {
                  params.set("country", country);
                }
                setPage(1);
                fetchTrending(params);
                const urlParams = new URLSearchParams(searchParams.toString());
                if (country) {
                  urlParams.set("country", country);
                }
                urlParams.delete("state");
                router.replace(`/hikes?${urlParams.toString()}`);
                router.refresh();
              }}
              className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500 hover:border-slate-300"
            >
              All
            </button>
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
          >
            Use my location
          </button>
        </div>
      </div>

      {showLocationPrompt && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          Share your location to see trending hikes near you. We only store your region,
          never precise coordinates.{" "}
          <Link href="/privacy" className="underline">
            Learn more
          </Link>
          .
        </div>
      )}

      {importStatus && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          <div className="flex items-center justify-between">
            <span>{importStatus.message}</span>
            <span>{importStatus.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${importStatus.progress}%` }}
            />
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-24 rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-600">
          {error} If this is a new region, allow a moment for imports to finish.
        </p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No trending hikes found for this state yet. Fetching trails now…
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((hike) => (
            <Link
              key={hike.id}
              href={`/hikes/${hike.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{hike.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {hike.state ? `${hike.state}, ` : ""}
                    {hike.country}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-emerald-600">
                    {hike.rating.toFixed(1)} ★
                  </div>
                  <div>{hike.reviews} reviews</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
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
                <span>{hike.difficulty}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  Score {hike.popularityScore}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
        >
          Show more
        </button>
      )}
    </section>
  );
}
