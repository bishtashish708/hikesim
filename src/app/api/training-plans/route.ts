import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type TrainingPlanPayload = {
  hikeId?: string;
  targetDate?: string;
  trainingStartDate?: string;
  settings?: unknown;
  weeks?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as TrainingPlanPayload;
  if (!body.hikeId) {
    return NextResponse.json({ error: "Hike is required." }, { status: 400 });
  }
  if (!body.targetDate) {
    return NextResponse.json({ error: "Target date is required." }, { status: 400 });
  }
  if (!body.trainingStartDate) {
    return NextResponse.json({ error: "Training start date is required." }, { status: 400 });
  }

  const targetDate = new Date(body.targetDate);
  const trainingStartDate = new Date(body.trainingStartDate);
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Target date is invalid." }, { status: 400 });
  }
  if (Number.isNaN(trainingStartDate.getTime())) {
    return NextResponse.json({ error: "Training start date is invalid." }, { status: 400 });
  }

  const created = await prisma.trainingPlan.create({
    data: {
      hikeId: body.hikeId,
      trainingStartDate,
      targetDate,
      settings: body.settings ?? {},
      weeks: body.weeks ?? [],
    },
  });

  return NextResponse.json({ id: created.id });
}
