import { NextResponse } from "next/server";
import { Country, State } from "country-state-city";

type GeoResult = {
  address?: {
    state?: string;
    region?: string;
    country?: string;
  };
};

const DEFAULT_COUNTRY = "United States";
const DEFAULT_COUNTRY_CODE = "US";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ country: DEFAULT_COUNTRY, countryCode: DEFAULT_COUNTRY_CODE }, { status: 400 });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    return NextResponse.json({ country: DEFAULT_COUNTRY, countryCode: DEFAULT_COUNTRY_CODE }, { status: 502 });
  }

  const data = (await response.json()) as GeoResult;
  const countryName = data?.address?.country || DEFAULT_COUNTRY;
  const stateName = data?.address?.state || data?.address?.region || "";

  const countryMatch = Country.getAllCountries().find(
    (country) => country.name.toLowerCase() === countryName.toLowerCase()
  );
  const countryCode = countryMatch?.isoCode ?? DEFAULT_COUNTRY_CODE;

  const stateMatch = stateName
    ? State.getStatesOfCountry(countryCode).find(
        (state) => state.name.toLowerCase() === stateName.toLowerCase()
      )
    : undefined;

  return NextResponse.json({
    country: countryMatch?.name ?? countryName,
    countryCode,
    state: stateMatch?.name ?? stateName,
    stateCode: stateMatch?.isoCode ?? null,
  });
}

export const runtime = "nodejs";
