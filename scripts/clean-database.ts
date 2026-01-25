/**
 * Clean Database Script
 * Removes low-quality trails that don't meet minimum requirements:
 * - Less than 10 miles for out-and-back trails
 * - Less than 500ft elevation gain
 * - Seed/junk data
 *
 * Run: npx tsx scripts/clean-database.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { QUALITY_RULES } from '../src/agents/config';

async function cleanDatabase() {
  console.log('\n🧹 Database Cleanup\n');
  console.log('Quality Requirements:');
  console.log(`  - Minimum distance: ${QUALITY_RULES.minDistanceMiles} miles (out-and-back)`);
  console.log(`  - Minimum elevation: ${QUALITY_RULES.minElevationFt} ft`);
  console.log(`  - Remove seed/junk data\n`);

  // Get current counts
  const totalBefore = await prisma.hike.count();
  const seedCount = await prisma.hike.count({ where: { isSeed: true } });

  console.log(`📊 Current Database:`);
  console.log(`   Total trails: ${totalBefore}`);
  console.log(`   Seed data: ${seedCount}\n`);

  // Analyze what will be removed
  const tooShort = await prisma.hike.count({
    where: {
      distanceMiles: { lt: QUALITY_RULES.minDistanceMiles },
      isSeed: false,
    },
  });

  const lowElevation = await prisma.hike.count({
    where: {
      elevationGainFt: { lt: QUALITY_RULES.minElevationFt },
      isSeed: false,
    },
  });

  const bothIssues = await prisma.hike.count({
    where: {
      distanceMiles: { lt: QUALITY_RULES.minDistanceMiles },
      elevationGainFt: { lt: QUALITY_RULES.minElevationFt },
      isSeed: false,
    },
  });

  console.log(`🔍 Trails to Remove:`);
  console.log(`   Seed data: ${seedCount}`);
  console.log(`   Too short (<${QUALITY_RULES.minDistanceMiles}mi): ${tooShort}`);
  console.log(`   Low elevation (<${QUALITY_RULES.minElevationFt}ft): ${lowElevation}`);
  console.log(`   Both issues: ${bothIssues}\n`);

  // Calculate trails that will remain
  const willRemain = await prisma.hike.count({
    where: {
      isSeed: false,
      distanceMiles: { gte: QUALITY_RULES.minDistanceMiles },
      elevationGainFt: { gte: QUALITY_RULES.minElevationFt },
    },
  });

  console.log(`✅ Trails Meeting Requirements: ${willRemain}\n`);

  if (willRemain === 0) {
    console.log('⚠️  WARNING: No trails meet the requirements!');
    console.log('   Consider lowering the minimum distance or elevation.\n');
    return;
  }

  // Show sample of trails that will remain
  const sampleRemaining = await prisma.hike.findMany({
    where: {
      isSeed: false,
      distanceMiles: { gte: QUALITY_RULES.minDistanceMiles },
      elevationGainFt: { gte: QUALITY_RULES.minElevationFt },
    },
    select: {
      name: true,
      parkName: true,
      distanceMiles: true,
      elevationGainFt: true,
      difficulty: true,
    },
    take: 10,
    orderBy: { distanceMiles: 'desc' },
  });

  console.log(`📋 Sample Quality Trails (Top 10 by distance):\n`);
  sampleRemaining.forEach((trail, idx) => {
    console.log(`${idx + 1}. ${trail.name}`);
    console.log(`   Park: ${trail.parkName}`);
    console.log(`   ${trail.distanceMiles}mi, ${trail.elevationGainFt}ft, ${trail.difficulty || 'N/A'}\n`);
  });

  // Confirm deletion
  console.log(`⚠️  READY TO DELETE:`);
  console.log(`   Will remove: ${totalBefore - willRemain} trails`);
  console.log(`   Will keep: ${willRemain} quality trails\n`);

  console.log('🗑️  Deleting low-quality trails...\n');

  // Delete in transaction
  const result = await prisma.$transaction([
    // Delete seed data
    prisma.hike.deleteMany({
      where: { isSeed: true },
    }),
    // Delete trails that are too short OR have low elevation
    prisma.hike.deleteMany({
      where: {
        isSeed: false,
        OR: [
          { distanceMiles: { lt: QUALITY_RULES.minDistanceMiles } },
          { elevationGainFt: { lt: QUALITY_RULES.minElevationFt } },
        ],
      },
    }),
  ]);

  const totalAfter = await prisma.hike.count();

  console.log(`✅ Cleanup Complete!\n`);
  console.log(`📊 Results:`);
  console.log(`   Before: ${totalBefore} trails`);
  console.log(`   Removed: ${totalBefore - totalAfter} trails`);
  console.log(`   After: ${totalAfter} quality trails\n`);

  // Show final distribution by park
  const byPark = await prisma.hike.groupBy({
    by: ['parkName'],
    _count: true,
    orderBy: { _count: { parkName: 'desc' } },
  });

  console.log(`📍 Trails by Park:\n`);
  byPark.forEach((park) => {
    console.log(`   ${park.parkName}: ${park._count} trails`);
  });

  console.log('\n✅ Database cleaned successfully!\n');

  await prisma.$disconnect();
}

// Run cleanup
cleanDatabase().catch((error) => {
  console.error('\n❌ Cleanup failed:', error);
  process.exit(1);
});
