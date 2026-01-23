import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'US';
  const state = searchParams.get('state');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const where: any = {
      countryCode: country,
    };

    if (state) {
      where.stateCode = state;
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
      orderBy: [
        { stateCode: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group by state/region
    const groupedByState: Record<string, typeof trails> = {};

    for (const trail of trails) {
      const key = trail.stateCode || 'Unknown';
      if (!groupedByState[key]) {
        groupedByState[key] = [];
      }
      groupedByState[key].push(trail);
    }

    return NextResponse.json({
      trails,
      groupedByState,
      count: trails.length,
    });
  } catch (error) {
    console.error('Trail by region error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails by region' },
      { status: 500 }
    );
  }
}
