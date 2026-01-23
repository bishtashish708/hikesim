import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Training plan id is required." }, { status: 400 });
  }

  const plan = await prisma.trainingPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    return NextResponse.json({ error: "Training plan not found." }, { status: 404 });
  }

  const latestRevision = await prisma.trainingPlanRevision.findFirst({
    where: { trainingPlanId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plan: {
      id: plan.id,
      hikeId: plan.hikeId,
      trainingStartDate: plan.trainingStartDate,
      targetDate: plan.targetDate,
      settings: plan.settings,
      weeks: plan.weeks,
      createdAt: plan.createdAt,
    },
    revision: latestRevision
      ? {
          id: latestRevision.id,
          settings: latestRevision.settings,
          weeks: latestRevision.weeks,
          changeLog: latestRevision.changeLog,
          createdAt: latestRevision.createdAt,
        }
      : null,
  });
}
