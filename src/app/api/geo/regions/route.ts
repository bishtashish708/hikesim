import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/geo/regions?country=US
 * Returns parks (for US) or states (for India) based on country
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ error: 'Country parameter required' }, { status: 400 });
  }

  try {
    if (country === 'US') {
      // Return National Parks
      const parks = await prisma.hike.findMany({
        where: {
          countryCode: 'US',
          isSeed: false,
          parkName: { not: null },
        },
        select: { parkName: true },
        distinct: ['parkName'],
      });

      const parkList = parks
        .map((p) => p.parkName)
        .filter(Boolean)
        .sort();

      return NextResponse.json({
        type: 'parks',
        regions: parkList,
        count: parkList.length,
      });
    } else if (country === 'IN') {
      // Return States
      const states = await prisma.hike.groupBy({
        by: ['stateCode'],
        where: { countryCode: 'IN', isSeed: false },
        _count: true,
      });

      const stateList = states.map((s) => ({
        code: s.stateCode,
        name: s.stateCode === 'UK' ? 'Uttarakhand' : 'Himachal Pradesh',
        count: s._count,
      }));

      return NextResponse.json({
        type: 'states',
        regions: stateList,
        count: stateList.length,
      });
    }

    return NextResponse.json({ regions: [], count: 0 });
  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
  }
}
