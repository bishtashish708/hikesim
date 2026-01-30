import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkAndAwardBadges } from "@/lib/badgeService";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

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
    } catch {
      return null;
    }
  }

  return null;
}

type WorkoutPayload = {
  source?: string;
  externalId?: string;
  workoutType?: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  durationMinutes?: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  startedAt: string;
  endedAt?: string;
  startLatitude?: number;
  startLongitude?: number;
  routeData?: unknown;
  title?: string;
  notes?: string;
  rawData?: unknown;
};

// GET - List user's workouts
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: {
    userId: string;
    startedAt?: { gte?: Date; lte?: Date };
  } = { userId: user.id };

  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate) where.startedAt.lte = new Date(endDate);
  }

  const [workouts, total] = await Promise.all([
    prisma.workout.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.workout.count({ where }),
  ]);

  // Calculate summary stats
  const stats = await prisma.workout.aggregate({
    where: { userId: user.id },
    _sum: {
      distanceMiles: true,
      elevationGainFt: true,
      durationMinutes: true,
      caloriesBurned: true,
    },
    _count: true,
  });

  return NextResponse.json({
    workouts,
    total,
    stats: {
      totalWorkouts: stats._count,
      totalDistanceMiles: stats._sum.distanceMiles || 0,
      totalElevationGainFt: stats._sum.elevationGainFt || 0,
      totalDurationMinutes: stats._sum.durationMinutes || 0,
      totalCaloriesBurned: stats._sum.caloriesBurned || 0,
    },
  });
}

// POST - Create a new workout (manual or from health sync)
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as WorkoutPayload;

  if (!body.startedAt) {
    return NextResponse.json({ error: "Start time is required." }, { status: 400 });
  }

  const startedAt = new Date(body.startedAt);
  if (Number.isNaN(startedAt.getTime())) {
    return NextResponse.json({ error: "Invalid start time." }, { status: 400 });
  }

  // Check for duplicate if externalId is provided
  if (body.externalId && body.source) {
    const existing = await prisma.workout.findFirst({
      where: {
        userId: user.id,
        source: body.source as never,
        externalId: body.externalId,
      },
    });
    if (existing) {
      return NextResponse.json({
        message: "Workout already exists.",
        workout: existing,
        duplicate: true
      });
    }
  }

  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      source: (body.source as never) || 'MANUAL',
      externalId: body.externalId,
      workoutType: (body.workoutType as never) || 'HIKE',
      distanceMiles: body.distanceMiles,
      elevationGainFt: body.elevationGainFt,
      durationMinutes: body.durationMinutes,
      caloriesBurned: body.caloriesBurned,
      avgHeartRate: body.avgHeartRate,
      maxHeartRate: body.maxHeartRate,
      startedAt,
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
      startLatitude: body.startLatitude,
      startLongitude: body.startLongitude,
      routeData: body.routeData ?? null,
      title: body.title,
      notes: body.notes,
      rawData: body.rawData ?? null,
    },
  });

  // Check for new badges after logging workout
  const badgeResult = await checkAndAwardBadges(user.id);

  return NextResponse.json({
    workout,
    newBadges: badgeResult.newBadges,
  }, { status: 201 });
}
