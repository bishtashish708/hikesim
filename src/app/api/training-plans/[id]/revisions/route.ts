import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = {
  params: { id: string };
};

type RevisionPayload = {
  settings?: unknown;
  weeks?: unknown;
  changeLog?: unknown;
};

export async function POST(request: Request, { params }: Params) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Training plan id is required." }, { status: 400 });
  }
  const body = (await request.json()) as RevisionPayload;
  const created = await prisma.trainingPlanRevision.create({
    data: {
      trainingPlanId: id,
      settings: body.settings ?? {},
      weeks: body.weeks ?? [],
      changeLog: body.changeLog ?? [],
    },
  });
  return NextResponse.json({ id: created.id });
}
