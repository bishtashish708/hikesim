import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Hike ID is required" }, { status: 400 });
  }

  const hike = await prisma.hike.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      distanceMiles: true,
      elevationGainFt: true,
      difficulty: true,
      difficultyRating: true,
      trailType: true,
      parkName: true,
      stateCode: true,
      countryCode: true,
      region: true,
      city: true,
      latitude: true,
      longitude: true,
      routeType: true,
      profilePoints: true,
      primaryImageUrl: true,
      images: true,
      imagesEnrichedAt: true,
    },
  });

  if (!hike) {
    return NextResponse.json({ error: "Hike not found" }, { status: 404 });
  }

  return NextResponse.json(hike);
}
