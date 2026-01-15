import { NextResponse } from "next/server";
import { Country } from "country-state-city";

export async function GET() {
  const countries = Country.getAllCountries()
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ countries });
}

export const runtime = "nodejs";
