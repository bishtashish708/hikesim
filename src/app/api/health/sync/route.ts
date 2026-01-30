import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

// Helper to get user from session or JWT token
async function getAuthenticatedUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });
    return user;
  }

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

type WorkoutData = {
  externalId: string;
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
  title?: string;
  rawData?: unknown;
};

type SyncPayload = {
  platform: string;
  workouts: WorkoutData[];
};

// POST - Batch sync workouts from a health platform
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as SyncPayload;

  if (!body.platform) {
    return NextResponse.json({ error: "Platform is required." }, { status: 400 });
  }

  if (!body.workouts || !Array.isArray(body.workouts)) {
    return NextResponse.json({ error: "Workouts array is required." }, { status: 400 });
  }

  const validPlatforms = ['APPLE_HEALTH', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'FITBIT'];
  if (!validPlatforms.includes(body.platform)) {
    return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
  }

  // Get existing workout externalIds to check for duplicates
  const existingWorkouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      source: body.platform as never,
      externalId: { in: body.workouts.map(w => w.externalId).filter(Boolean) as string[] },
    },
    select: { externalId: true },
  });

  const existingIds = new Set(existingWorkouts.map(w => w.externalId));

  // Filter out duplicates
  const newWorkouts = body.workouts.filter(w => !existingIds.has(w.externalId));

  if (newWorkouts.length === 0) {
    // Update last sync time even if no new workouts
    await prisma.healthConnection.updateMany({
      where: {
        userId: user.id,
        platform: body.platform as never,
      },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      imported: 0,
      skipped: body.workouts.length,
      message: "All workouts already synced.",
    });
  }

  // Batch create new workouts
  const created = await prisma.workout.createMany({
    data: newWorkouts.map(w => ({
      userId: user.id,
      source: body.platform as never,
      externalId: w.externalId,
      workoutType: (w.workoutType as never) || 'HIKE',
      distanceMiles: w.distanceMiles,
      elevationGainFt: w.elevationGainFt,
      durationMinutes: w.durationMinutes,
      caloriesBurned: w.caloriesBurned,
      avgHeartRate: w.avgHeartRate,
      maxHeartRate: w.maxHeartRate,
      startedAt: new Date(w.startedAt),
      endedAt: w.endedAt ? new Date(w.endedAt) : null,
      startLatitude: w.startLatitude,
      startLongitude: w.startLongitude,
      title: w.title,
      rawData: w.rawData ?? null,
    })),
  });

  // Update health connection last sync time
  await prisma.healthConnection.updateMany({
    where: {
      userId: user.id,
      platform: body.platform as never,
    },
    data: {
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({
    imported: created.count,
    skipped: body.workouts.length - newWorkouts.length,
    message: `Successfully imported ${created.count} workout(s).`,
  });
}
