import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type CleanupPayload = {
  countryCode?: string;
  stateCode?: string;
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const body = (await request.json()) as CleanupPayload;
  const countryCode = body.countryCode?.toUpperCase();
  const stateCode = body.stateCode?.toUpperCase();

  const result = await prisma.hike.deleteMany({
    where: {
      isSeed: false,
      ...(countryCode ? { countryCode } : {}),
      ...(stateCode ? { stateCode } : {}),
    },
  });

  return NextResponse.json({ deleted: result.count });
}

export const runtime = "nodejs";
