import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/hikes/by-park
 * Returns hikes filtered by National Park with pagination
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const park = searchParams.get('park');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      countryCode: 'US',
      isSeed: false, // Only show real trails, not seed data
    };

    if (park) {
      where.parkName = park;
    }

    const [items, total] = await Promise.all([
      prisma.hike.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { parkName: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          distanceMiles: true,
          elevationGainFt: true,
          difficulty: true,
          trailType: true,
          parkName: true,
          stateCode: true,
          description: true,
          latitude: true,
          longitude: true,
        },
      }),
      prisma.hike.count({ where }),
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
      parkName: park || 'All Parks',
    });
  } catch (error) {
    console.error('Error fetching hikes by park:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hikes' },
      { status: 500 }
    );
  }
}
