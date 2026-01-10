import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generatePlan,
  type FitnessLevel,
  type PlanSettings,
  type ProfilePoint,
} from "@/lib/planGenerator";

type PlanPayload = {
  hikeId?: string;
  fitnessLevel?: FitnessLevel;
  durationMode?: "auto" | "manual";
  targetDurationMinutes?: number;
  packWeightLbs?: number;
  treadmill?: {
    minInclinePercent?: number;
    maxInclinePercent?: number;
    maxSpeedMph?: number;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as PlanPayload;

  if (!body.hikeId) {
    return NextResponse.json({ error: "Hike is required." }, { status: 400 });
  }

  const fitnessLevel = body.fitnessLevel ?? "Intermediate";
  const durationMode = body.durationMode ?? "auto";
  const targetDurationMinutes = Number(body.targetDurationMinutes ?? 0);
  const packWeightLbs = Number(body.packWeightLbs ?? 0);
  const minInclinePercent = Number(body.treadmill?.minInclinePercent ?? 0);
  const maxInclinePercent = Number(body.treadmill?.maxInclinePercent ?? 12);
  const maxSpeedMph = Number(body.treadmill?.maxSpeedMph ?? 4.5);

  if (!["Beginner", "Intermediate", "Advanced"].includes(fitnessLevel)) {
    return NextResponse.json({ error: "Invalid fitness level." }, { status: 400 });
  }
  if (!["auto", "manual"].includes(durationMode)) {
    return NextResponse.json({ error: "Invalid duration mode." }, { status: 400 });
  }
  if (packWeightLbs < 0 || packWeightLbs > 30) {
    return NextResponse.json({ error: "Pack weight must be 0 to 30 lbs." }, { status: 400 });
  }
  if (minInclinePercent < 0 || maxInclinePercent <= minInclinePercent) {
    return NextResponse.json(
      { error: "Incline range must be valid and non-negative." },
      { status: 400 }
    );
  }
  if (maxSpeedMph < 2) {
    return NextResponse.json({ error: "Max speed must be at least 2 mph." }, { status: 400 });
  }
  if (durationMode === "manual" && targetDurationMinutes < 20) {
    return NextResponse.json(
      { error: "Manual duration should be at least 20 minutes." },
      { status: 400 }
    );
  }

  const hike = await prisma.hike.findUnique({
    where: { id: body.hikeId },
  });

  if (!hike) {
    return NextResponse.json({ error: "Hike not found." }, { status: 404 });
  }

  const settings: PlanSettings = {
    fitnessLevel,
    targetDurationMinutes: durationMode === "auto" ? "auto" : targetDurationMinutes,
    packWeightLbs,
    treadmill: {
      minInclinePercent,
      maxInclinePercent,
      maxSpeedMph,
    },
  };

  const profilePoints = hike.profilePoints as unknown as ProfilePoint[];
  const plan = generatePlan(profilePoints, hike.distanceMiles, hike.elevationGainFt, settings);

  const created = await prisma.generatedPlan.create({
    data: {
      hikeId: hike.id,
      settings: {
        ...settings,
        totalMinutes: plan.totalMinutes,
      },
      segments: plan.segments,
    },
  });

  return NextResponse.json({ id: created.id });
}
