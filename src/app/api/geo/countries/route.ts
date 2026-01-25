import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/geo/countries
 * Returns all distinct countries with trail counts
 */
export async function GET() {
  try {
    const countries = await prisma.hike.groupBy({
      by: ['countryCode'],
      where: { isSeed: false },
      _count: true,
      orderBy: { countryCode: 'asc' },
    });

    const countryList = countries.map((c) => ({
      code: c.countryCode,
      name: c.countryCode === 'US' ? 'United States' : 'India',
      count: c._count,
    }));

    return NextResponse.json({
      countries: countryList,
      total: countryList.length,
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
  }
}
