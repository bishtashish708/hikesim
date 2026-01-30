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

// GET - Get user's challenge progress
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // active, completed, all

  const where: {
    userId: string;
    status?: { in: string[] } | string;
  } = { userId: user.id };

  if (status === 'active') {
    where.status = 'ACTIVE';
  } else if (status === 'completed') {
    where.status = 'COMPLETED';
  } else if (status !== 'all') {
    // Default: show active and completed
    where.status = { in: ['ACTIVE', 'COMPLETED'] };
  }

  const progress = await prisma.userChallengeProgress.findMany({
    where,
    include: {
      challenge: {
        include: {
          completionBadge: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              iconName: true,
              rarity: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // ACTIVE first
      { updatedAt: 'desc' },
    ],
  });

  // Get user's earned badges
  const badges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    include: {
      badge: true,
    },
    orderBy: { earnedAt: 'desc' },
  });

  // Calculate overall stats
  const stats = {
    activeChallenges: progress.filter(p => p.status === 'ACTIVE').length,
    completedChallenges: progress.filter(p => p.status === 'COMPLETED').length,
    totalPoints: progress.reduce((sum, p) => sum + p.pointsEarned, 0),
    totalBadges: badges.length,
    longestStreak: Math.max(...progress.map(p => p.longestStreak), 0),
    totalDistanceCompleted: progress.reduce((sum, p) => sum + p.distanceCompleted, 0),
  };

  const formattedProgress = progress.map(p => ({
    id: p.id,
    challengeId: p.challengeId,
    challengeName: p.challenge.name,
    challengeDescription: p.challenge.description,
    challengeImageUrl: p.challenge.imageUrl,
    challengeDifficulty: p.challenge.difficulty,
    totalDistanceMiles: p.challenge.totalDistanceMiles,
    totalElevationGainFt: p.challenge.totalElevationGainFt,
    distanceCompleted: p.distanceCompleted,
    elevationCompleted: p.elevationCompleted,
    progressPercent: Math.min(100, (p.distanceCompleted / p.challenge.totalDistanceMiles) * 100),
    status: p.status,
    currentStreak: p.currentStreak,
    longestStreak: p.longestStreak,
    pointsEarned: p.pointsEarned,
    streakMultiplier: p.streakMultiplier,
    milestonesReached: p.milestonesReached,
    milestones: p.challenge.milestones,
    completionBadge: p.challenge.completionBadge,
    startedAt: p.startedAt,
    completedAt: p.completedAt,
    lastActivityDate: p.lastActivityDate,
  }));

  return NextResponse.json({
    progress: formattedProgress,
    badges: badges.map(b => ({
      id: b.badge.id,
      name: b.badge.name,
      description: b.badge.description,
      imageUrl: b.badge.imageUrl,
      iconName: b.badge.iconName,
      category: b.badge.category,
      rarity: b.badge.rarity,
      points: b.badge.points,
      earnedAt: b.earnedAt,
    })),
    stats,
  });
}
