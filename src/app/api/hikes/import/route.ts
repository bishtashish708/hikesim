import { NextResponse } from "next/server";
import { importProtectedTrails } from "@/lib/hikeImport";

type ImportPayload = {
  countryCode?: string;
  stateCode?: string;
  limit?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ImportPayload;
  const countryCode = body.countryCode?.toUpperCase() ?? "US";
  const stateCode = body.stateCode?.toUpperCase() ?? null;
  const limit = Math.min(Math.max(body.limit ?? 40, 1), 80);

  const result = await importProtectedTrails({
    countryCode,
    stateCode,
    limit,
  });

  if (result.fallbackNote === "Unknown country.") {
    return NextResponse.json({ error: result.fallbackNote }, { status: 400 });
  }
  if (result.fallbackNote === "Trail imports are only supported for US and India right now.") {
    return NextResponse.json({ error: result.fallbackNote }, { status: 400 });
  }
  if (result.fallbackNote === "Unable to fetch.") {
    return NextResponse.json({ error: "Unable to fetch trails." }, { status: 502 });
  }

  return NextResponse.json(result);
}

export const runtime = "nodejs";
