import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Country, State } from "country-state-city";

const DEFAULT_REGION = "US";
const PAGE_SIZE = 10;

const DEFAULT_COUNTRY_CODE = "US";
const MIN_DISTANCE_MILES = 0.6;
const MIN_ELEVATION_GAIN_FT = 200;
const MIN_DISTANCE_ABS = 0.2;

function normalizeCountry(country: string | null) {
  if (!country) return DEFAULT_COUNTRY_CODE;
  const trimmed = country.trim().toUpperCase();
  return trimmed.length ? trimmed : DEFAULT_COUNTRY_CODE;
}

function difficultyFor(hike: { distanceMiles: number; elevationGainFt: number }) {
  const score = hike.distanceMiles + hike.elevationGainFt / 1200;
  if (score < 5) return "Easy";
  if (score < 9) return "Moderate";
  return "Strenuous";
}

function seededNumber(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) % 1000;
  return min + (normalized / 1000) * (max - min);
}

function resolveCountryFromCoords(lat?: number, lon?: number) {
  if (lat == null || lon == null) return DEFAULT_COUNTRY_CODE;
  if (lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66) return "US";
  if (lat >= 42 && lat <= 83 && lon >= -141 && lon <= -52) return "CA";
  if (lat >= 14 && lat <= 33 && lon >= -118 && lon <= -86) return "MX";
  return DEFAULT_COUNTRY_CODE;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country");
  const statesParam = searchParams.get("states");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? PAGE_SIZE);

  const resolvedCountry = countryParam
    ? normalizeCountry(countryParam)
    : resolveCountryFromCoords(lat ? Number(lat) : undefined, lon ? Number(lon) : undefined);

  const selectedStates = statesParam
    ? statesParam
        .split(",")
        .map((state) => state.trim())
        .filter(Boolean)
    : [];

  const hikes = await prisma.hike.findMany({
    where: {
      AND: [
        {
          OR: [
            { distanceMiles: 0 },
            { distanceMiles: { gt: MIN_DISTANCE_ABS } },
          ],
        },
        {
          OR: [
            { isSeed: true },
            { distanceMiles: 0 },
            { distanceMiles: { gte: MIN_DISTANCE_MILES } },
            { elevationGainFt: { gte: MIN_ELEVATION_GAIN_FT } },
          ],
        },
      ],
    },
    orderBy: { name: "asc" },
  });

  const ranked = hikes.map((hike, index) => {
    const countryCode = hike.countryCode ?? DEFAULT_COUNTRY_CODE;
    const stateCode = hike.stateCode ?? null;
    const countryName =
      Country.getCountryByCode(countryCode)?.name ?? countryCode;
    const stateName = stateCode
      ? State.getStatesOfCountry(countryCode).find(
          (state) => state.isoCode === stateCode
        )?.name ?? stateCode
      : null;
    const rating = Number(seededNumber(hike.id + "rating", 4.1, 4.9).toFixed(1));
    const reviews = Math.round(seededNumber(hike.id + "reviews", 120, 1500));
    const popularityScore = Number(
      seededNumber(hike.id + "popularity", 72, 99).toFixed(1)
    );
    return {
      id: hike.id,
      name: hike.name,
      countryCode,
      stateCode,
      country: countryName,
      state: stateName,
      difficulty: difficultyFor(hike),
      distanceMiles: hike.distanceMiles,
      elevationGainFt: hike.elevationGainFt,
      rating,
      reviews,
      popularityScore,
      rank: index + 1,
    };
  });

  const filteredByReviews = ranked.filter((hike) => hike.reviews >= 1000);
  const filtered = filteredByReviews.filter((hike) => {
    if (hike.countryCode !== resolvedCountry) {
      return false;
    }
    if (selectedStates.length > 0) {
      return hike.stateCode ? selectedStates.includes(hike.stateCode) : false;
    }
    return true;
  });
  const fallback = filteredByReviews.filter(
    (hike) => hike.countryCode === DEFAULT_COUNTRY_CODE
  );
  const results =
    selectedStates.length > 0
      ? filtered
      : filtered.length
        ? filtered
        : fallback.length
          ? fallback
          : ranked;
  const total = results.length;
  const offset = (Math.max(page, 1) - 1) * limit;
  const items = results.slice(offset, offset + limit);

  return NextResponse.json({
    country: Country.getCountryByCode(resolvedCountry)?.name ?? resolvedCountry,
    countryCode: resolvedCountry,
    states: selectedStates,
    items,
    page: Math.max(page, 1),
    total,
    hasMore: offset + limit < total,
  });
}

export const runtime = "nodejs";
