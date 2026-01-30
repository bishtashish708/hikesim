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

// GET - List all available challenges
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  const { searchParams } = new URL(request.url);
  const featured = searchParams.get('featured') === 'true';
  const difficulty = searchParams.get('difficulty');
  const streakMode = searchParams.get('streakMode');

  const where: {
    isActive: boolean;
    isFeatured?: boolean;
    difficulty?: string;
    streakMode?: string;
  } = { isActive: true };

  if (featured) where.isFeatured = true;
  if (difficulty) where.difficulty = difficulty;
  if (streakMode) where.streakMode = streakMode;

  const challenges = await prisma.virtualChallenge.findMany({
    where,
    include: {
      sourceHike: {
        select: {
          id: true,
          name: true,
          parkName: true,
          stateCode: true,
          countryCode: true,
        },
      },
      completionBadge: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          iconName: true,
          rarity: true,
        },
      },
      _count: {
        select: { userProgress: true },
      },
    },
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // If user is logged in, include their progress status
  let userProgressMap: Record<string, string> = {};
  if (user) {
    const userProgress = await prisma.userChallengeProgress.findMany({
      where: { userId: user.id },
      select: { challengeId: true, status: true },
    });
    userProgressMap = Object.fromEntries(
      userProgress.map(p => [p.challengeId, p.status])
    );
  }

  const formattedChallenges = challenges.map(challenge => ({
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    imageUrl: challenge.imageUrl,
    totalDistanceMiles: challenge.totalDistanceMiles,
    totalElevationGainFt: challenge.totalElevationGainFt,
    difficulty: challenge.difficulty,
    estimatedDays: challenge.estimatedDays,
    maxDaysAllowed: challenge.maxDaysAllowed,
    streakMode: challenge.streakMode,
    milestones: challenge.milestones,
    completionPoints: challenge.completionPoints,
    isFeatured: challenge.isFeatured,
    sourceHike: challenge.sourceHike,
    completionBadge: challenge.completionBadge,
    participantCount: challenge._count.userProgress,
    userStatus: userProgressMap[challenge.id] || null,
  }));

  return NextResponse.json({ challenges: formattedChallenges });
}
