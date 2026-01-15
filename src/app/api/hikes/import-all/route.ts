import { NextResponse } from "next/server";
import { importAllProtectedTrails } from "@/lib/hikeImport";

type ImportAllPayload = {
  countryCode?: string;
  limitPerState?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ImportAllPayload;
  const countryCode = body.countryCode?.toUpperCase() ?? "US";
  const limitPerState = Math.min(Math.max(body.limitPerState ?? 15, 5), 30);

  const result = await importAllProtectedTrails({
    countryCode,
    limitPerState,
  });

  return NextResponse.json(result);
}

export const runtime = "nodejs";
