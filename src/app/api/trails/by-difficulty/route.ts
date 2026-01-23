import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DIFFICULTY_ORDER = ['Easy', 'Moderate', 'Hard', 'Very Hard'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get('level');
  const country = searchParams.get('country');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const where: any = {};

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (country) {
      where.countryCode = country;
    }

    const trails = await prisma.hike.findMany({
      where,
      select: {
        id: true,
        name: true,
        distanceMiles: true,
        elevationGainFt: true,
        difficulty: true,
        trailType: true,
        countryCode: true,
        stateCode: true,
        city: true,
        parkName: true,
        region: true,
        latitude: true,
        longitude: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    // Group by difficulty
    const groupedByDifficulty: Record<string, typeof trails> = {};

    for (const level of DIFFICULTY_ORDER) {
      groupedByDifficulty[level] = [];
    }

    for (const trail of trails) {
      const level = trail.difficulty || 'Unknown';
      if (!groupedByDifficulty[level]) {
        groupedByDifficulty[level] = [];
      }
      groupedByDifficulty[level].push(trail);
    }

    return NextResponse.json({
      trails,
      groupedByDifficulty,
      count: trails.length,
    });
  } catch (error) {
    console.error('Trail by difficulty error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails by difficulty' },
      { status: 500 }
    );
  }
}
