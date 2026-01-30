import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

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

// POST - Join a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if challenge exists and is active
  const challenge = await prisma.virtualChallenge.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (!challenge.isActive) {
    return NextResponse.json({ error: "Challenge is no longer active" }, { status: 400 });
  }

  // Check if user has already joined
  const existingProgress = await prisma.userChallengeProgress.findUnique({
    where: {
      userId_challengeId: {
        userId: user.id,
        challengeId: id,
      },
    },
  });

  if (existingProgress) {
    if (existingProgress.status === 'ACTIVE') {
      return NextResponse.json({
        message: "You've already joined this challenge",
        progress: existingProgress,
      });
    }

    // If they previously failed/abandoned, allow them to restart
    const updatedProgress = await prisma.userChallengeProgress.update({
      where: { id: existingProgress.id },
      data: {
        status: 'ACTIVE',
        distanceCompleted: 0,
        elevationCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        graceDaysUsed: 0,
        milestonesReached: [],
        pointsEarned: 0,
        streakMultiplier: 1.0,
        dailyLogs: [],
        startedAt: new Date(),
        completedAt: null,
      },
    });

    return NextResponse.json({
      message: "Challenge restarted!",
      progress: updatedProgress,
    });
  }

  // Create new progress entry
  const progress = await prisma.userChallengeProgress.create({
    data: {
      userId: user.id,
      challengeId: id,
      status: 'ACTIVE',
      distanceCompleted: 0,
      elevationCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      graceDaysUsed: 0,
      milestonesReached: [],
      pointsEarned: 0,
      streakMultiplier: 1.0,
      dailyLogs: [],
    },
  });

  return NextResponse.json({
    message: `You've joined "${challenge.name}"!`,
    progress,
  }, { status: 201 });
}
