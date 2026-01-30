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

// GET - Get challenge details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);

  const challenge = await prisma.virtualChallenge.findUnique({
    where: { id },
    include: {
      sourceHike: {
        select: {
          id: true,
          name: true,
          parkName: true,
          stateCode: true,
          countryCode: true,
          latitude: true,
          longitude: true,
          difficulty: true,
        },
      },
      completionBadge: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          iconName: true,
          rarity: true,
          points: true,
        },
      },
      _count: {
        select: { userProgress: true },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Get user's progress if logged in
  let userProgress = null;
  if (user) {
    userProgress = await prisma.userChallengeProgress.findUnique({
      where: {
        userId_challengeId: {
          userId: user.id,
          challengeId: id,
        },
      },
    });
  }

  // Get leaderboard (top 10 by progress)
  const leaderboard = await prisma.userChallengeProgress.findMany({
    where: {
      challengeId: id,
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    orderBy: [
      { status: 'asc' }, // COMPLETED first
      { distanceCompleted: 'desc' },
    ],
    take: 10,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json({
    challenge: {
      ...challenge,
      participantCount: challenge._count.userProgress,
    },
    userProgress,
    leaderboard: leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user.id,
      userName: entry.user.name || 'Anonymous',
      userImage: entry.user.image,
      distanceCompleted: entry.distanceCompleted,
      status: entry.status,
      currentStreak: entry.currentStreak,
      completedAt: entry.completedAt,
    })),
  });
}
