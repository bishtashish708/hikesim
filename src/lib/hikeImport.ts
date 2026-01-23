import { Country, State } from "country-state-city";
import { prisma } from "@/lib/db";

type OverpassElement = {
  id: number;
  type: "way" | "relation";
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type GeoResult = {
  latitude: number;
  longitude: number;
};

type ImportResult = {
  imported: number;
  failed: number;
  total: number;
  fallbackNote?: string | null;
};

type DebugResult = {
  query: string;
  total: number;
  sampleNames: string[];
  fallbackNote?: string | null;
  endpoint?: string;
};

const DEFAULT_LIMIT = 40;
const SUPPORTED_COUNTRIES = new Set(["US", "IN"]);
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];
const PROTECTED_NAME_BY_COUNTRY: Record<string, string> = {
  US: "National Park|National Forest",
  IN: "National Park|Wildlife Sanctuary|Tiger Reserve",
};

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

function computeDistanceMiles(geometry: { lat: number; lon: number }[]) {
  if (geometry.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < geometry.length; i += 1) {
    total += haversineMiles(geometry[i - 1], geometry[i]);
  }
  return Number(total.toFixed(2));
}

function sampleGeometry(geometry: { lat: number; lon: number }[], points = 20) {
  if (geometry.length <= points) return geometry;
  const step = (geometry.length - 1) / (points - 1);
  return Array.from({ length: points }, (_, index) => geometry[Math.round(index * step)]);
}

async function fetchElevations(points: { lat: number; lon: number }[]) {
  if (points.length === 0) return null;
  const latitudes = points.map((p) => p.lat.toFixed(5)).join(",");
  const longitudes = points.map((p) => p.lon.toFixed(5)).join(",");
  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", latitudes);
  url.searchParams.set("longitude", longitudes);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (!Array.isArray(data.elevation)) {
    return null;
  }
  return data.elevation as number[];
}

function buildProfile(
  points: { lat: number; lon: number }[],
  elevations: number[],
  totalMiles: number
) {
  const profile = points.map((point, index) => ({
    distanceMiles:
      index === 0
        ? 0
        : Number(((index / (points.length - 1)) * totalMiles).toFixed(2)),
    elevationFt: Math.round(elevations[index] * 3.28084),
  }));
  return profile;
}

function computeElevationGain(elevations: number[]) {
  let gain = 0;
  for (let i = 1; i < elevations.length; i += 1) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) gain += delta;
  }
  return Math.round(gain * 3.28084);
}

async function lookupStateCenter(stateName: string, countryCode: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", stateName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("country_code", countryCode.toLowerCase());

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: GeoResult[] };
  const first = data.results?.[0];
  if (!first) return null;
  return { lat: first.latitude, lon: first.longitude };
}

function buildProtectedAreasQuery(
  countryCode: string,
  stateName: string | null,
  stateCode: string | null,
  namePattern: string,
  limit: number
) {
  return `
    [out:json][timeout:60];
    area["ISO3166-1"="${countryCode}"][admin_level=2]->.country;
    ${
      stateCode
        ? `area["ISO3166-2"="${countryCode}-${stateCode}"](area.country)->.searchArea;`
        : stateName
          ? `area["name"="${stateName}"]["admin_level"~"4|6"](area.country)->.searchArea;`
          : "(.country)->.searchArea;"
    }
    (
      relation["boundary"="protected_area"]["name"~"${namePattern}",i](area.searchArea);
      way["boundary"="protected_area"]["name"~"${namePattern}",i](area.searchArea);
      relation["boundary"="national_park"](area.searchArea);
      way["boundary"="national_park"](area.searchArea);
      relation["boundary"="national_forest"](area.searchArea);
      way["boundary"="national_forest"](area.searchArea);
      relation["leisure"="nature_reserve"]["name"~"${namePattern}",i](area.searchArea);
      way["leisure"="nature_reserve"]["name"~"${namePattern}",i](area.searchArea);
    )->.protected;
    map_to_area -> .protectedArea;
    (
      relation["route"="hiking"]["name"](area.protectedArea);
      relation["route"="foot"]["sac_scale"]["name"](area.protectedArea);
      way["highway"~"path|footway|track"]["sac_scale"]["name"]["footway"!="sidewalk"](area.protectedArea);
      way["highway"="path"]["trail_visibility"]["name"](area.protectedArea);
    );
    out body geom ${limit};
  `;
}

function buildProtectedAreasAroundQuery(
  lat: number,
  lon: number,
  namePattern: string,
  limit: number,
  radiusMeters = 250000
) {
  return `
    [out:json][timeout:60];
    (
      relation["boundary"="protected_area"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
      way["boundary"="protected_area"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
      relation["boundary"="national_park"](around:${radiusMeters},${lat},${lon});
      way["boundary"="national_park"](around:${radiusMeters},${lat},${lon});
      relation["boundary"="national_forest"](around:${radiusMeters},${lat},${lon});
      way["boundary"="national_forest"](around:${radiusMeters},${lat},${lon});
      relation["leisure"="nature_reserve"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
      way["leisure"="nature_reserve"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
    )->.protected;
    map_to_area -> .protectedArea;
    (
      relation["route"="hiking"]["name"](area.protectedArea);
      relation["route"="foot"]["sac_scale"]["name"](area.protectedArea);
      way["highway"~"path|footway|track"]["sac_scale"]["name"]["footway"!="sidewalk"](area.protectedArea);
      way["highway"="path"]["trail_visibility"]["name"](area.protectedArea);
    );
    out body geom ${limit};
  `;
}

function enforceQuality(distanceMiles: number, elevationGainFt: number) {
  if (distanceMiles < 0.6 && elevationGainFt < 200) {
    return false;
  }
  if (distanceMiles <= 0.2) {
    return false;
  }
  return true;
}

async function fetchOverpass(query: string) {
  let lastError: string | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "HikeSim/1.0 (local dev)",
        },
        body: query,
        signal: controller.signal,
      });
      if (response.ok) {
        const data = (await response.json()) as OverpassResponse;
        clearTimeout(timeout);
        return { data, endpoint };
      }
      lastError = `Overpass ${endpoint} responded ${response.status}`;
    } catch (error) {
      lastError = `Overpass ${endpoint} failed`;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(lastError ?? "Overpass fetch failed");
}

export async function importProtectedTrails({
  countryCode,
  stateCode,
  limit = DEFAULT_LIMIT,
}: {
  countryCode: string;
  stateCode?: string | null;
  limit?: number;
}): Promise<ImportResult> {
  const upperCountry = countryCode.toUpperCase();
  const upperState = stateCode ? stateCode.toUpperCase() : null;

  if (!SUPPORTED_COUNTRIES.has(upperCountry)) {
    return {
      imported: 0,
      failed: 0,
      total: 0,
      fallbackNote: "Trail imports are only supported for US and India right now.",
    };
  }

  const country = Country.getCountryByCode(upperCountry);
  if (!country) {
    return { imported: 0, failed: 0, total: 0, fallbackNote: "Unknown country." };
  }

  const stateName = upperState
    ? State.getStatesOfCountry(upperCountry).find((state) => state.isoCode === upperState)
        ?.name
    : null;

  const namePattern = PROTECTED_NAME_BY_COUNTRY[upperCountry] ?? "National Park";

  let query = buildProtectedAreasQuery(upperCountry, stateName ?? null, upperState ?? null, namePattern, limit);
  let fallbackNote: string | null = null;

  let elements: OverpassElement[] = [];
  try {
    const { data } = await fetchOverpass(query);
    elements = data.elements ?? [];
  } catch (error) {
    return { imported: 0, failed: 0, total: 0, fallbackNote: "Unable to fetch." };
  }

  if (elements.length === 0 && stateName) {
    const center = await lookupStateCenter(stateName, upperCountry);
    if (center) {
      query = buildProtectedAreasAroundQuery(center.lat, center.lon, namePattern, limit);
      try {
        const { data } = await fetchOverpass(query);
        elements = data.elements ?? [];
        if (elements.length > 0) {
          fallbackNote =
            "No national park or forest found in this state. Showing the nearest protected areas.";
        }
      } catch (error) {
        return { imported: 0, failed: 0, total: 0, fallbackNote: "Unable to fetch." };
      }
    }
  }

  let imported = 0;
  let failed = 0;

  for (const element of elements.slice(0, limit)) {
    const name = element.tags?.name?.trim();
    if (!name || !element.geometry || element.geometry.length < 2) {
      failed += 1;
      continue;
    }

    const existing = await prisma.hike.findFirst({
      where: { name, countryCode: upperCountry, stateCode: upperState },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const geometry = element.geometry;
    const sampled = sampleGeometry(geometry, 20);
    const elevations = (await fetchElevations(sampled)) ?? sampled.map(() => 0);
    const distanceMiles = computeDistanceMiles(geometry);
    const elevationGainFt = elevations.some((value) => value > 0)
      ? computeElevationGain(elevations)
      : Math.round(distanceMiles * 200);

    if (!enforceQuality(distanceMiles, elevationGainFt)) {
      failed += 1;
      continue;
    }

    const elevationSource = elevations.some((value) => value > 0)
      ? elevations
      : sampled.map(() => 1500 / 3.28084);
    const profilePoints = buildProfile(sampled, elevationSource, distanceMiles);

    try {
      await prisma.hike.create({
        data: {
          name,
          distanceMiles,
          elevationGainFt,
          countryCode: upperCountry,
          stateCode: upperState,
          profilePoints,
          isSeed: false,
        },
      });
      imported += 1;
    } catch (error) {
      failed += 1;
    }
  }

  return { imported, failed, total: elements.length, fallbackNote };
}

export async function importAllProtectedTrails({
  countryCode,
  limitPerState = 15,
}: {
  countryCode: string;
  limitPerState?: number;
}) {
  const upperCountry = countryCode.toUpperCase();
  const states = State.getStatesOfCountry(upperCountry);
  const results: Array<{
    stateCode: string | null;
    imported: number;
    failed: number;
    total: number;
    note?: string | null;
  }> = [];
  let imported = 0;
  let failed = 0;

  if (states.length === 0) {
    const result = await importProtectedTrails({
      countryCode: upperCountry,
      stateCode: null,
      limit: limitPerState,
    });
    imported += result.imported;
    failed += result.failed;
    results.push({
      stateCode: null,
      imported: result.imported,
      failed: result.failed,
      total: result.total,
      note: result.fallbackNote,
    });
    return { imported, failed, results };
  }

  for (const state of states) {
    const result = await importProtectedTrails({
      countryCode: upperCountry,
      stateCode: state.isoCode,
      limit: limitPerState,
    });
    imported += result.imported;
    failed += result.failed;
    results.push({
      stateCode: state.isoCode,
      imported: result.imported,
      failed: result.failed,
      total: result.total,
      note: result.fallbackNote,
    });
  }

  return { imported, failed, results };
}

export async function debugProtectedTrails({
  countryCode,
  stateCode,
  limit = DEFAULT_LIMIT,
}: {
  countryCode: string;
  stateCode?: string | null;
  limit?: number;
}): Promise<DebugResult> {
  const upperCountry = countryCode.toUpperCase();
  const upperState = stateCode ? stateCode.toUpperCase() : null;
  const country = Country.getCountryByCode(upperCountry);
  if (!country) {
    return { query: "", total: 0, sampleNames: [], fallbackNote: "Unknown country." };
  }

  const stateName = upperState
    ? State.getStatesOfCountry(upperCountry).find((state) => state.isoCode === upperState)
        ?.name
    : null;
  const namePattern = PROTECTED_NAME_BY_COUNTRY[upperCountry] ?? "National Park";

  let query = buildProtectedAreasQuery(upperCountry, stateName ?? null, upperState ?? null, namePattern, limit);
  let fallbackNote: string | null = null;

  let elements: OverpassElement[] = [];
  let endpoint: string | undefined;
  try {
    const result = await fetchOverpass(query);
    elements = result.data.elements ?? [];
    endpoint = result.endpoint;
  } catch (error) {
    return { query, total: 0, sampleNames: [], fallbackNote: "Unable to fetch." };
  }

  if (elements.length === 0 && stateName) {
    const center = await lookupStateCenter(stateName, upperCountry);
    if (center) {
      query = buildProtectedAreasAroundQuery(center.lat, center.lon, namePattern, limit);
      try {
        const result = await fetchOverpass(query);
        elements = result.data.elements ?? [];
        endpoint = result.endpoint;
        if (elements.length > 0) {
          fallbackNote =
            "No national park or forest found in this state. Showing the nearest protected areas.";
        }
      } catch (error) {
        return { query, total: 0, sampleNames: [], fallbackNote: "Unable to fetch." };
      }
    }
  }

  const sampleNames = elements
    .map((element) => element.tags?.name?.trim())
    .filter(Boolean)
    .slice(0, 10) as string[];

  return { query, total: elements.length, sampleNames, fallbackNote, endpoint };
}
