import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type HikePayload = {
  name?: string;
  distanceMiles?: number;
  elevationGainFt?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as HikePayload;
  const name = body.name?.trim();
  const distanceMiles = Number(body.distanceMiles);
  const elevationGainFt = Number(body.elevationGainFt);

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return NextResponse.json({ error: "Distance must be greater than 0." }, { status: 400 });
  }
  if (!Number.isFinite(elevationGainFt) || elevationGainFt < 0) {
    return NextResponse.json({ error: "Elevation gain must be 0 or higher." }, { status: 400 });
  }

  const profilePoints = buildProfile(distanceMiles, elevationGainFt);

  const hike = await prisma.hike.create({
    data: {
      name,
      distanceMiles,
      elevationGainFt: Math.round(elevationGainFt),
      profilePoints,
      isSeed: false,
    },
  });

  return NextResponse.json({ id: hike.id });
}

function buildProfile(distanceMiles: number, elevationGainFt: number, points = 20) {
  const startElevation = 4200 + Math.round(elevationGainFt * 0.12);
  const profile = [];

  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const trend = startElevation + elevationGainFt * progress;
    const wiggle = Math.sin(progress * Math.PI * 3) * elevationGainFt * 0.06;
    const dip = Math.sin(progress * Math.PI * 6) * elevationGainFt * 0.04;
    const elevation = Math.round(trend + wiggle + dip);
    profile.push({
      distanceMiles: Number((distanceMiles * progress).toFixed(2)),
      elevationFt: elevation,
    });
  }

  return profile;
}
