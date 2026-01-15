import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ElevationPoint = {
  distanceMiles: number;
  elevationFt: number;
};

function buildProfile(distanceMiles: number, elevationGainFt: number, points = 20) {
  const startElevation = 4800 + Math.round(elevationGainFt * 0.15);
  const result: ElevationPoint[] = [];

  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const trend = startElevation + elevationGainFt * progress;
    const wiggle = Math.sin(progress * Math.PI * 3) * elevationGainFt * 0.08;
    const dip = Math.sin(progress * Math.PI * 7) * elevationGainFt * 0.03;
    const elevation = Math.round(trend + wiggle + dip);
    const distance = Number((distanceMiles * progress).toFixed(2));

    result.push({
      distanceMiles: distance,
      elevationFt: elevation,
    });
  }

  return result;
}

export async function GET() {
  const hikes = await prisma.hike.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(hikes);
}

type CreateHikePayload = {
  name?: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  countryCode?: string;
  stateCode?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CreateHikePayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Please name your hike." }, { status: 400 });
  }
  if (!body.distanceMiles || body.distanceMiles <= 0) {
    return NextResponse.json({ error: "Distance must be greater than 0." }, { status: 400 });
  }
  if (body.elevationGainFt == null || body.elevationGainFt < 0) {
    return NextResponse.json({ error: "Elevation gain must be 0 or higher." }, { status: 400 });
  }
  if (!body.countryCode) {
    return NextResponse.json({ error: "Country is required." }, { status: 400 });
  }

  const created = await prisma.hike.create({
    data: {
      name,
      distanceMiles: body.distanceMiles,
      elevationGainFt: body.elevationGainFt,
      countryCode: body.countryCode.toUpperCase(),
      stateCode: body.stateCode ? body.stateCode.toUpperCase() : null,
      profilePoints: buildProfile(body.distanceMiles, body.elevationGainFt),
    },
  });

  return NextResponse.json({ id: created.id });
}
