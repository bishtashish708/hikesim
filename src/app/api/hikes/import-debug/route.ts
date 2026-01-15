import { NextResponse } from "next/server";
import { debugProtectedTrails } from "@/lib/hikeImport";

type DebugPayload = {
  countryCode?: string;
  stateCode?: string;
  limit?: number;
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const body = (await request.json()) as DebugPayload;
  const countryCode = body.countryCode?.toUpperCase() ?? "US";
  const stateCode = body.stateCode?.toUpperCase() ?? null;
  const limit = Math.min(Math.max(body.limit ?? 20, 5), 50);

  const result = await debugProtectedTrails({ countryCode, stateCode, limit });

  if (result.fallbackNote === "Unknown country.") {
    return NextResponse.json({ error: result.fallbackNote }, { status: 400 });
  }
  if (result.fallbackNote === "Unable to fetch.") {
    return NextResponse.json({ error: "Unable to fetch trails." }, { status: 502 });
  }

  return NextResponse.json(result);
}

export const runtime = "nodejs";
