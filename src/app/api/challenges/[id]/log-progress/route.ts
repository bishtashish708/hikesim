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

type Milestone = {
  distanceMiles: number;
  name: string;
  description?: string;
  badgeId?: string;
};

type DailyLog = {
  date: string;
  distanceMiles: number;
  elevationFt?: number;
  workoutId?: string;
};

type LogProgressPayload = {
  distanceMiles: number;
  elevationFt?: number;
  workoutId?: string;
  date?: string;
};

// POST - Log progress for a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as LogProgressPayload;

  if (!body.distanceMiles || body.distanceMiles <= 0) {
    return NextResponse.json({ error: "Distance is required and must be positive" }, { status: 400 });
  }

  // Get challenge and user's progress
  const [challenge, progress] = await Promise.all([
    prisma.virtualChallenge.findUnique({
      where: { id },
      include: {
        completionBadge: true,
      },
    }),
    prisma.userChallengeProgress.findUnique({
      where: {
        userId_challengeId: {
          userId: user.id,
          challengeId: id,
        },
      },
    }),
  ]);

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (!progress) {
    return NextResponse.json({ error: "You haven't joined this challenge" }, { status: 400 });
  }

  if (progress.status !== 'ACTIVE') {
    return NextResponse.json({ error: `Challenge is ${progress.status.toLowerCase()}` }, { status: 400 });
  }

  const today = body.date ? new Date(body.date) : new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Parse existing daily logs
  const dailyLogs = (progress.dailyLogs as DailyLog[]) || [];

  // Check if already logged today
  const existingTodayLog = dailyLogs.find(log => log.date === todayStr);
  if (existingTodayLog) {
    // Update today's log
    existingTodayLog.distanceMiles += body.distanceMiles;
    existingTodayLog.elevationFt = (existingTodayLog.elevationFt || 0) + (body.elevationFt || 0);
  } else {
    // Add new log
    dailyLogs.push({
      date: todayStr,
      distanceMiles: body.distanceMiles,
      elevationFt: body.elevationFt,
      workoutId: body.workoutId,
    });
  }

  // Calculate new totals
  const newDistanceCompleted = progress.distanceCompleted + body.distanceMiles;
  const newElevationCompleted = progress.elevationCompleted + (body.elevationFt || 0);

  // Calculate streak
  let newStreak = progress.currentStreak;
  let newGraceDaysUsed = progress.graceDaysUsed;
  const lastActivity = progress.lastActivityDate;

  if (lastActivity) {
    const lastActivityDate = new Date(lastActivity);
    const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, streak unchanged
    } else if (daysDiff === 1) {
      // Consecutive day, increase streak
      newStreak += 1;
    } else if (daysDiff === 2 && challenge.streakMode === 'GRACE_PERIOD' && newGraceDaysUsed < 1) {
      // Grace period: 1 day off allowed per week
      newStreak += 1;
      newGraceDaysUsed += 1;
    } else if (challenge.streakMode === 'FLEXIBLE') {
      // Flexible mode: no streak penalty
      newStreak = daysDiff === 1 ? newStreak + 1 : 1;
    } else if (challenge.streakMode === 'STRICT' && daysDiff > 1) {
      // Strict mode: streak broken, challenge failed
      await prisma.userChallengeProgress.update({
        where: { id: progress.id },
        data: {
          status: 'FAILED',
          currentStreak: 0,
        },
      });
      return NextResponse.json({
        error: "Challenge failed - streak broken in strict mode",
        status: 'FAILED',
      }, { status: 400 });
    } else {
      // Streak broken
      newStreak = 1;
      newGraceDaysUsed = 0;
    }
  } else {
    // First activity
    newStreak = 1;
  }

  // Reset grace days at start of new week (simplified: reset after 7 days)
  if (newStreak % 7 === 1 && newStreak > 1) {
    newGraceDaysUsed = 0;
  }

  // Calculate streak multiplier (bonus for consecutive days)
  let newMultiplier = 1.0;
  if (newStreak >= 3) newMultiplier = 1.1;
  if (newStreak >= 7) newMultiplier = 1.25;
  if (newStreak >= 14) newMultiplier = 1.5;
  if (newStreak >= 30) newMultiplier = 2.0;

  // Check milestones
  const milestones = (challenge.milestones as Milestone[]) || [];
  const previousMilestones = (progress.milestonesReached as number[]) || [];
  const newMilestonesReached: number[] = [...previousMilestones];
  const justReachedMilestones: Milestone[] = [];

  milestones.forEach((milestone, index) => {
    if (!previousMilestones.includes(index) && newDistanceCompleted >= milestone.distanceMiles) {
      newMilestonesReached.push(index);
      justReachedMilestones.push(milestone);
    }
  });

  // Calculate points earned this session
  const basePoints = Math.round(body.distanceMiles * 10);
  const streakBonus = Math.round(basePoints * (newMultiplier - 1));
  const milestonePoints = justReachedMilestones.length * 25;
  const sessionPoints = basePoints + streakBonus + milestonePoints;
  const newTotalPoints = progress.pointsEarned + sessionPoints;

  // Check if challenge is completed
  let isCompleted = false;
  let completionBonus = 0;
  if (newDistanceCompleted >= challenge.totalDistanceMiles) {
    isCompleted = true;
    completionBonus = challenge.completionPoints;

    // Award completion badge if exists
    if (challenge.completionBadge) {
      await prisma.userBadge.upsert({
        where: {
          userId_badgeId: {
            userId: user.id,
            badgeId: challenge.completionBadge.id,
          },
        },
        create: {
          userId: user.id,
          badgeId: challenge.completionBadge.id,
          challengeId: challenge.id,
          metadata: {
            completionTime: new Date().toISOString(),
            finalStreak: newStreak,
            totalPoints: newTotalPoints + completionBonus,
          },
        },
        update: {},
      });
    }
  }

  // Update progress
  const updatedProgress = await prisma.userChallengeProgress.update({
    where: { id: progress.id },
    data: {
      distanceCompleted: newDistanceCompleted,
      elevationCompleted: newElevationCompleted,
      currentStreak: newStreak,
      longestStreak: Math.max(progress.longestStreak, newStreak),
      lastActivityDate: today,
      graceDaysUsed: newGraceDaysUsed,
      milestonesReached: newMilestonesReached,
      pointsEarned: newTotalPoints + (isCompleted ? completionBonus : 0),
      streakMultiplier: newMultiplier,
      dailyLogs,
      status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      completedAt: isCompleted ? new Date() : null,
    },
  });

  return NextResponse.json({
    progress: updatedProgress,
    session: {
      distanceAdded: body.distanceMiles,
      basePoints,
      streakBonus,
      milestonePoints,
      sessionPoints: sessionPoints + (isCompleted ? completionBonus : 0),
      completionBonus: isCompleted ? completionBonus : 0,
      currentStreak: newStreak,
      multiplier: newMultiplier,
    },
    milestonesReached: justReachedMilestones,
    isCompleted,
    badge: isCompleted ? challenge.completionBadge : null,
  });
}
