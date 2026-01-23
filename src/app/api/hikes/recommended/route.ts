import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const experienceLevel = searchParams.get('experience') || 'BEGINNER';

    // Define criteria based on experience level
    let maxDistance = 5; // miles
    let maxElevation = 1500; // feet
    let difficulties = ['Easy', 'Moderate'];

    if (experienceLevel === 'INTERMEDIATE') {
      maxDistance = 10;
      maxElevation = 3000;
      difficulties = ['Moderate', 'Hard'];
    } else if (experienceLevel === 'ADVANCED') {
      maxDistance = 20;
      maxElevation = 5000;
      difficulties = ['Hard', 'Very Hard'];
    }

    // Get recommended hikes
    const hikes = await prisma.hike.findMany({
      where: {
        distanceMiles: { lte: maxDistance },
        elevationGainFt: { lte: maxElevation },
        difficulty: { in: difficulties },
        isSeed: true,
      },
      orderBy: [
        { difficulty: 'asc' },
        { distanceMiles: 'asc' },
      ],
      take: 8,
    });

    // If we don't have enough hikes with difficulty set, fallback to any seed hikes
    if (hikes.length < 3) {
      const fallbackHikes = await prisma.hike.findMany({
        where: {
          distanceMiles: { lte: maxDistance },
          elevationGainFt: { lte: maxElevation },
          isSeed: true,
        },
        orderBy: [
          { distanceMiles: 'asc' },
          { elevationGainFt: 'asc' },
        ],
        take: 8,
      });
      return NextResponse.json({ hikes: fallbackHikes });
    }

    return NextResponse.json({ hikes });
  } catch (error) {
    console.error('Error fetching recommended hikes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
