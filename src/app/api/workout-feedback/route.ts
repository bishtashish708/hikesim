import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    date?: string;
    workoutType?: string;
    completed?: boolean;
    perceivedDifficulty?: number;
    actualMinutes?: number;
    notes?: string;
    planId?: string;
  };
  if (!body.date || !body.workoutType) {
    return NextResponse.json({ error: "Date and workout type are required." }, { status: 400 });
  }
  const record = await prisma.workoutFeedback.create({
    data: {
      userId: session.user.id,
      planId: body.planId ?? null,
      date: new Date(body.date),
      workoutType: body.workoutType,
      completed: Boolean(body.completed),
      perceivedDifficulty: body.perceivedDifficulty ?? null,
      actualMinutes: body.actualMinutes ?? null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json({ id: record.id });
}
