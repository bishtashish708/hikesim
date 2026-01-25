/**
 * Verify AllTrails Import Quality
 * Run: npx tsx scripts/verify-alltrails-import.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function verifyImport() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFYING ALLTRAILS DATA IMPORT');
  console.log('='.repeat(80) + '\n');

  // Total trails
  const total = await prisma.hike.count({ where: { isSeed: false } });
  console.log(`📊 Total Trails: ${total}\n`);

  // Trails with AllTrails data
  const withAllTrails = await prisma.hike.count({
    where: { allTrailsId: { not: null } },
  });

  console.log(`✅ Trails with AllTrails data: ${withAllTrails}/${total}\n`);

  // Data completeness
  const withDistance = await prisma.hike.count({
    where: { distanceMiles: { gt: 0 } },
  });

  const withElevation = await prisma.hike.count({
    where: { elevationGainFt: { gt: 0 } },
  });

  const withCoords = await prisma.hike.count({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  const withRatings = await prisma.hike.count({
    where: {
      avgRating: { not: null },
      numReviews: { gt: 0 },
    },
  });

  console.log('📈 Data Completeness:');
  console.log(`   Distance: ${withDistance}/${total} (${((withDistance / total) * 100).toFixed(1)}%)`);
  console.log(`   Elevation: ${withElevation}/${total} (${((withElevation / total) * 100).toFixed(1)}%)`);
  console.log(`   Coordinates: ${withCoords}/${total} (${((withCoords / total) * 100).toFixed(1)}%)`);
  console.log(`   Ratings: ${withRatings}/${total} (${((withRatings / total) * 100).toFixed(1)}%)\n`);

  // Sample high-quality trails
  console.log('📋 Sample High-Quality Trails:\n');

  const samples = await prisma.hike.findMany({
    where: {
      isSeed: false,
      distanceMiles: { gte: 10 },
      elevationGainFt: { gte: 2000 },
      avgRating: { gte: 4.5 },
    },
    select: {
      name: true,
      parkName: true,
      distanceMiles: true,
      elevationGainFt: true,
      difficulty: true,
      avgRating: true,
      numReviews: true,
    },
    orderBy: { avgRating: 'desc' },
    take: 10,
  });

  samples.forEach((trail, idx) => {
    console.log(`${idx + 1}. ${trail.name}`);
    console.log(`   ${trail.parkName}`);
    console.log(`   ${trail.distanceMiles.toFixed(1)} mi, ${trail.elevationGainFt} ft, ${trail.difficulty}`);
    console.log(`   ⭐ ${trail.avgRating}/5 (${trail.numReviews} reviews)\n`);
  });

  // Elevation data accuracy check - compare known trails
  console.log('🎯 Elevation Accuracy Check (Known Trails):\n');

  const knownTrails = [
    { name: 'Half Dome Trail', expected: 4800 },
    { name: 'Clouds Rest Trail', expected: 2300 },
    { name: 'Angels Landing Trail', expected: 1500 },
  ];

  for (const known of knownTrails) {
    const trail = await prisma.hike.findFirst({
      where: { name: { contains: known.name.split(' ')[0] } },
      select: {
        name: true,
        elevationGainFt: true,
        parkName: true,
      },
    });

    if (trail) {
      const diff = Math.abs(trail.elevationGainFt - known.expected);
      const pct = ((diff / known.expected) * 100).toFixed(1);
      const status = diff < 200 ? '✅' : '⚠️';

      console.log(`${status} ${trail.name}`);
      console.log(`   Expected: ${known.expected} ft`);
      console.log(`   Actual: ${trail.elevationGainFt} ft`);
      console.log(`   Difference: ${diff} ft (${pct}%)\n`);
    }
  }

  // Quality distribution
  console.log('📊 Trail Difficulty Distribution:\n');

  const byDifficulty = await prisma.hike.groupBy({
    by: ['difficulty'],
    _count: true,
    orderBy: { _count: { difficulty: 'desc' } },
  });

  byDifficulty.forEach((group) => {
    const pct = ((group._count / total) * 100).toFixed(1);
    console.log(`   ${group.difficulty || 'Unknown'}: ${group._count} (${pct}%)`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

verifyImport().catch((error) => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
