/**
 * List current trails in database for verification
 * Run: npx tsx scripts/list-current-trails.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function listTrails() {
  console.log('\n📊 Current Trail Data (Needs Verification Against AllTrails)\n');
  console.log('='.repeat(80));
  console.log('\n');

  const trails = await prisma.hike.findMany({
    where: { isSeed: false },
    select: {
      name: true,
      parkName: true,
      distanceMiles: true,
      elevationGainFt: true,
      difficulty: true,
    },
    orderBy: [
      { parkName: 'asc' },
      { distanceMiles: 'desc' },
    ],
  });

  console.log(`Total trails: ${trails.length}\n`);

  // Group by park
  const byPark = trails.reduce((acc, trail) => {
    const park = trail.parkName || 'Unknown';
    if (!acc[park]) acc[park] = [];
    acc[park].push(trail);
    return acc;
  }, {} as Record<string, typeof trails>);

  // Display by park
  Object.entries(byPark).forEach(([park, parkTrails]) => {
    console.log(`\n📍 ${park} (${parkTrails.length} trails)`);
    console.log('-'.repeat(80));

    parkTrails.forEach((trail, idx) => {
      console.log(`\n${idx + 1}. ${trail.name}`);
      console.log(`   Distance: ${trail.distanceMiles} mi`);
      console.log(`   Elevation Gain: ${trail.elevationGainFt} ft`);
      console.log(`   Difficulty: ${trail.difficulty || 'N/A'}`);
    });
  });

  console.log('\n\n' + '='.repeat(80));
  console.log('⚠️  ACTION REQUIRED: Manually verify these trails against AllTrails');
  console.log('='.repeat(80));
  console.log('\nCheck each trail on AllTrails.com and compare:');
  console.log('  1. Distance (miles)');
  console.log('  2. Elevation gain (feet)');
  console.log('  3. Trail name accuracy\n');

  await prisma.$disconnect();
}

listTrails().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
