import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

type TrainingPlanPayload = {
  hikeId?: string;
  targetDate?: string;
  trainingStartDate?: string;
  settings?: unknown;
  weeks?: unknown;
};

// Helper to get user from session or JWT token
async function getAuthenticatedUser(request: NextRequest) {
  // First try NextAuth session (for web app)
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });
    return user;
  }

  // Then try JWT token (for mobile app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true },
      });
      return user;
    } catch (error) {
      return null;
    }
  }

  return null;
}

// GET - List user's training plans
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id },
    include: {
      hike: {
        select: {
          id: true,
          name: true,
          distanceMiles: true,
          elevationGainFt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Format the response for mobile app
  const formattedPlans = plans.map(plan => ({
    id: plan.id,
    hikeName: plan.hike?.name || 'Custom Hike',
    distanceMiles: plan.hike?.distanceMiles || 0,
    elevationGainFt: plan.hike?.elevationGainFt || 0,
    targetDate: plan.targetDate,
    trainingStartDate: plan.trainingStartDate,
    durationWeeks: Math.ceil((new Date(plan.targetDate).getTime() - new Date(plan.trainingStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    fitnessLevel: (plan.settings as any)?.fitnessLevel || 'beginner',
    weeklySchedule: plan.weeks || [],
    createdAt: plan.createdAt,
  }));

  return NextResponse.json(formattedPlans);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
      userId: user.id,
      hikeId: body.hikeId,
      trainingStartDate,
      targetDate,
      settings: body.settings ?? {},
      weeks: body.weeks ?? [],
    },
  });

  return NextResponse.json({ id: created.id });
}
