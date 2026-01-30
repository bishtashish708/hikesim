import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkAndAwardBadges, getUserBadges, getUserStats } from "@/lib/badgeService";

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

// GET - Get user's badges and stats
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check and award any new badges
  const badgeResult = await checkAndAwardBadges(user.id);

  // Get user's badges
  const badges = await getUserBadges(user.id);

  // Get user's stats
  const stats = await getUserStats(user.id);

  // Get total available badges for progress
  const totalBadges = await prisma.badge.count();

  return NextResponse.json({
    badges,
    newlyAwarded: badgeResult.newBadges,
    stats,
    progress: {
      earned: badges.length,
      total: totalBadges,
      percentage: totalBadges > 0 ? Math.round((badges.length / totalBadges) * 100) : 0,
    },
  });
}

// POST - Force check for new badges
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check and award badges
  const result = await checkAndAwardBadges(user.id);

  return NextResponse.json({
    newBadges: result.newBadges,
    message: result.newBadges.length > 0
      ? `Congratulations! You earned ${result.newBadges.length} new badge(s)!`
      : 'No new badges earned yet. Keep hiking!',
  });
}
