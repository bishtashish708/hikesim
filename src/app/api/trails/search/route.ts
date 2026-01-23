import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const country = searchParams.get('country');
  const state = searchParams.get('state');
  const difficulty = searchParams.get('difficulty');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const where: any = {};

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { parkName: { contains: query, mode: 'insensitive' } },
        { region: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (country) {
      where.countryCode = country;
    }

    if (state) {
      where.stateCode = state;
    }

    if (difficulty) {
      where.difficulty = difficulty;
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

    return NextResponse.json({
      trails,
      count: trails.length,
    });
  } catch (error) {
    console.error('Trail search error:', error);
    return NextResponse.json(
      { error: 'Failed to search trails' },
      { status: 500 }
    );
  }
}
