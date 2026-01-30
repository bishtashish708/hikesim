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

type LeaderboardType = 'distance' | 'elevation' | 'workouts' | 'streak' | 'challenges' | 'points';
type TimeFrame = 'weekly' | 'monthly' | 'allTime';

// GET - Get global leaderboard
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'distance') as LeaderboardType;
  const timeFrame = (searchParams.get('timeFrame') || 'weekly') as TimeFrame;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  // Calculate date range based on timeFrame
  let startDate: Date | null = null;
  const now = new Date();

  if (timeFrame === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeFrame === 'monthly') {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  }

  const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

  let leaderboard: {
    rank: number;
    userId: string;
    userName: string;
    value: number;
    isCurrentUser: boolean;
  }[] = [];

  switch (type) {
    case 'distance': {
      const results = await prisma.workout.groupBy({
        by: ['userId'],
        where: dateFilter,
        _sum: { distanceMiles: true },
        orderBy: { _sum: { distanceMiles: 'desc' } },
        take: limit,
      });

      const userIds = results.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name || 'Anonymous Hiker']));

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || 'Anonymous Hiker',
        value: Math.round((r._sum.distanceMiles || 0) * 10) / 10,
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }

    case 'elevation': {
      const results = await prisma.workout.groupBy({
        by: ['userId'],
        where: dateFilter,
        _sum: { elevationGainFt: true },
        orderBy: { _sum: { elevationGainFt: 'desc' } },
        take: limit,
      });

      const userIds = results.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name || 'Anonymous Hiker']));

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || 'Anonymous Hiker',
        value: Math.round(r._sum.elevationGainFt || 0),
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }

    case 'workouts': {
      const results = await prisma.workout.groupBy({
        by: ['userId'],
        where: dateFilter,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
      });

      const userIds = results.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name || 'Anonymous Hiker']));

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || 'Anonymous Hiker',
        value: r._count.id,
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }

    case 'streak': {
      // Get users with highest current streak from challenge progress
      const results = await prisma.userChallengeProgress.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          userId: true,
          currentStreak: true,
          user: {
            select: { name: true },
          },
        },
        orderBy: { currentStreak: 'desc' },
        take: limit,
        distinct: ['userId'],
      });

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: r.user?.name || 'Anonymous Hiker',
        value: r.currentStreak,
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }

    case 'challenges': {
      // Get users with most completed challenges
      const results = await prisma.userChallengeProgress.groupBy({
        by: ['userId'],
        where: {
          status: 'COMPLETED',
          ...(startDate ? { completedAt: { gte: startDate } } : {}),
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
      });

      const userIds = results.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name || 'Anonymous Hiker']));

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || 'Anonymous Hiker',
        value: r._count.id,
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }

    case 'points': {
      // Get users with most total points
      const results = await prisma.userChallengeProgress.groupBy({
        by: ['userId'],
        where: {
          status: 'COMPLETED',
          ...(startDate ? { completedAt: { gte: startDate } } : {}),
        },
        _sum: { pointsEarned: true },
        orderBy: { _sum: { pointsEarned: 'desc' } },
        take: limit,
      });

      const userIds = results.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name || 'Anonymous Hiker']));

      leaderboard = results.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || 'Anonymous Hiker',
        value: r._sum.pointsEarned || 0,
        isCurrentUser: user?.id === r.userId,
      }));
      break;
    }
  }

  // Get current user's rank if they're not in the top results
  let currentUserRank = null;
  if (user && !leaderboard.some(l => l.isCurrentUser)) {
    const userPosition = leaderboard.findIndex(l => l.userId === user.id);
    if (userPosition === -1) {
      // User not in leaderboard, calculate their rank
      currentUserRank = await calculateUserRank(user.id, type, startDate);
    }
  }

  return NextResponse.json({
    type,
    timeFrame,
    leaderboard,
    currentUserRank,
    updatedAt: new Date().toISOString(),
  });
}

async function calculateUserRank(
  userId: string,
  type: LeaderboardType,
  startDate: Date | null
): Promise<{ rank: number; value: number } | null> {
  const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

  switch (type) {
    case 'distance': {
      const userStats = await prisma.workout.aggregate({
        where: { userId, ...dateFilter },
        _sum: { distanceMiles: true },
      });

      const userValue = userStats._sum.distanceMiles || 0;

      // Count how many users have more distance
      const usersAbove = await prisma.workout.groupBy({
        by: ['userId'],
        where: dateFilter,
        _sum: { distanceMiles: true },
        having: { distanceMiles: { _sum: { gt: userValue } } },
      });

      return {
        rank: usersAbove.length + 1,
        value: Math.round(userValue * 10) / 10,
      };
    }

    case 'elevation': {
      const userStats = await prisma.workout.aggregate({
        where: { userId, ...dateFilter },
        _sum: { elevationGainFt: true },
      });

      const userValue = userStats._sum.elevationGainFt || 0;

      const usersAbove = await prisma.workout.groupBy({
        by: ['userId'],
        where: dateFilter,
        _sum: { elevationGainFt: true },
        having: { elevationGainFt: { _sum: { gt: userValue } } },
      });

      return {
        rank: usersAbove.length + 1,
        value: Math.round(userValue),
      };
    }

    default:
      return null;
  }
}
