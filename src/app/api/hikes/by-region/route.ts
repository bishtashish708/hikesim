import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/hikes/by-region
 * Returns hikes filtered by country, park (US), or state (India)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const region = searchParams.get('region'); // park name for US, state code for India
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '500');
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      isSeed: false,
    };

    if (country) {
      where.countryCode = country;
    }

    if (region) {
      if (country === 'US') {
        where.parkName = region;
      } else if (country === 'IN') {
        where.stateCode = region;
      }
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
          countryCode: true,
          region: true,
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
      country,
      region,
    });
  } catch (error) {
    console.error('Error fetching hikes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hikes' },
      { status: 500 }
    );
  }
}
