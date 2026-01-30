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

type ConnectionPayload = {
  platform: string;
  isConnected?: boolean;
  metadata?: unknown;
};

// GET - List user's health connections
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const connections = await prisma.healthConnection.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      platform: true,
      isConnected: true,
      lastSyncAt: true,
      metadata: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ connections });
}

// POST - Create or update a health connection
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as ConnectionPayload;

  if (!body.platform) {
    return NextResponse.json({ error: "Platform is required." }, { status: 400 });
  }

  const validPlatforms = ['APPLE_HEALTH', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'FITBIT'];
  if (!validPlatforms.includes(body.platform)) {
    return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
  }

  // Upsert the connection
  const connection = await prisma.healthConnection.upsert({
    where: {
      userId_platform: {
        userId: user.id,
        platform: body.platform as never,
      },
    },
    update: {
      isConnected: body.isConnected ?? true,
      metadata: body.metadata ?? undefined,
    },
    create: {
      userId: user.id,
      platform: body.platform as never,
      isConnected: body.isConnected ?? true,
      metadata: body.metadata ?? {},
    },
  });

  return NextResponse.json({ connection });
}

// DELETE - Disconnect a health platform
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');

  if (!platform) {
    return NextResponse.json({ error: "Platform is required." }, { status: 400 });
  }

  await prisma.healthConnection.updateMany({
    where: {
      userId: user.id,
      platform: platform as never,
    },
    data: {
      isConnected: false,
    },
  });

  return NextResponse.json({ success: true });
}
