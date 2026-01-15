import { NextResponse } from "next/server";
import { State } from "country-state-city";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("country");

  if (!countryCode) {
    return NextResponse.json({ states: [] });
  }

  const states = State.getStatesOfCountry(countryCode.toUpperCase())
    .map((state) => ({ code: state.isoCode, name: state.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ states });
}

export const runtime = "nodejs";
