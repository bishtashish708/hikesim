import { NextResponse } from "next/server";
import { Country, State } from "country-state-city";
import { prisma } from "@/lib/db";

const MIN_DISTANCE_MILES = 0.6;
const MIN_ELEVATION_GAIN_FT = 200;
const MIN_DISTANCE_ABS = 0.2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCountry = searchParams.get("country");
  const rawState = searchParams.get("state");

  const normalizedCountry = rawCountry
    ? Country.getAllCountries().find(
        (item) =>
          item.isoCode.toLowerCase() === rawCountry.toLowerCase() ||
          item.name.toLowerCase() === rawCountry.toLowerCase()
      )?.isoCode ?? rawCountry
    : null;

  const normalizedState =
    normalizedCountry && rawState
      ? State.getStatesOfCountry(normalizedCountry).find(
          (item) =>
            item.isoCode.toLowerCase() === rawState.toLowerCase() ||
            item.name.toLowerCase() === rawState.toLowerCase()
        )?.isoCode ?? rawState
      : null;

  const hikes = await prisma.hike.findMany({
    where: {
      ...(normalizedCountry ? { countryCode: normalizedCountry } : {}),
      ...(normalizedState ? { stateCode: normalizedState } : {}),
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

  const items = hikes.map((hike) => {
    const countryName =
      Country.getCountryByCode(hike.countryCode)?.name ?? hike.countryCode;
    const stateName = hike.stateCode
      ? State.getStatesOfCountry(hike.countryCode).find(
          (item) => item.isoCode === hike.stateCode
        )?.name ?? hike.stateCode
      : null;
    return {
      id: hike.id,
      name: hike.name,
      distanceMiles: hike.distanceMiles,
      elevationGainFt: hike.elevationGainFt,
      isSeed: hike.isSeed,
      countryName,
      stateName,
    };
  });

  return NextResponse.json({ items });
}

export const runtime = "nodejs";
