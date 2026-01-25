import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/geo/parks
 * Returns all unique National Parks from our database
 */
export async function GET() {
  try {
    // Get all unique park names from our US trail database
    const parks = await prisma.hike.findMany({
      where: {
        parkName: { not: null },
        countryCode: 'US',
      },
      select: {
        parkName: true,
      },
      distinct: ['parkName'],
    });

    // Format for UI dropdowns and sort alphabetically
    const parkList = parks
      .map(p => p.parkName)
      .filter(Boolean)
      .sort();

    return NextResponse.json({
      parks: parkList,
      count: parkList.length,
    });
  } catch (error) {
    console.error('Error fetching parks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parks' },
      { status: 500 }
    );
  }
}
