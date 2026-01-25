/**
 * Clean up database - Remove junk, seeded, and incomplete trail data
 *
 * This script will:
 * 1. Identify and remove seed trails (isSeed = true)
 * 2. Remove trails with invalid coordinates (0,0 or null)
 * 3. Remove trails with no name or generic names
 * 4. Remove trails with no distance or elevation data
 * 5. Remove trails with no park name
 * 6. Show before/after statistics
 */

import { prisma } from '../src/lib/db';

interface CleanupStats {
  totalBefore: number;
  seedTrails: number;
  invalidCoordinates: number;
  noName: number;
  genericNames: number;
  noDistance: number;
  noParkName: number;
  totalRemoved: number;
  totalAfter: number;
}

// Only match trails that are EXACTLY these generic names (case-insensitive)
const GENERIC_NAMES = [
  'Trail',
  'Unnamed',
  'Unnamed Trail',
  'Unknown',
  'Unknown Trail',
  'Path',
  'Route',
  'Track',
  'Hiking Trail',
  'Walking Path',
  'Nature Trail',
  'Test Trail',
  'Sample Trail',
  'Trail 1',
  'Trail 2',
  'Footpath',
  'Walkway',
];

async function cleanupDatabase(dryRun: boolean = true) {
  console.log('\n🧹 DATABASE CLEANUP SCRIPT\n' + '='.repeat(80));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '🔴 LIVE (will delete data)'}\n`);

  const stats: CleanupStats = {
    totalBefore: 0,
    seedTrails: 0,
    invalidCoordinates: 0,
    noName: 0,
    genericNames: 0,
    noDistance: 0,
    noParkName: 0,
    totalRemoved: 0,
    totalAfter: 0,
  };

  // Get total count before cleanup
  stats.totalBefore = await prisma.hike.count();
  console.log(`📊 Total trails before cleanup: ${stats.totalBefore}\n`);

  // 1. Find seed trails
  console.log('1️⃣  Checking for seed trails (isSeed = true)...');
  const seedTrails = await prisma.hike.findMany({
    where: { isSeed: true },
    select: { id: true, name: true, parkName: true },
  });
  stats.seedTrails = seedTrails.length;
  if (seedTrails.length > 0) {
    console.log(`   ⚠️  Found ${seedTrails.length} seed trails:`);
    seedTrails.slice(0, 5).forEach(t => console.log(`      - ${t.name} (${t.parkName || 'No park'})`));
    if (seedTrails.length > 5) console.log(`      ... and ${seedTrails.length - 5} more`);
  } else {
    console.log('   ✅ No seed trails found');
  }

  // 2. Find trails with invalid coordinates (0,0 or null)
  console.log('\n2️⃣  Checking for invalid coordinates...');
  const invalidCoords = await prisma.hike.findMany({
    where: {
      OR: [
        { latitude: 0, longitude: 0 },
        { latitude: null },
        { longitude: null },
      ],
    },
    select: { id: true, name: true, latitude: true, longitude: true, parkName: true },
  });
  stats.invalidCoordinates = invalidCoords.length;
  if (invalidCoords.length > 0) {
    console.log(`   ⚠️  Found ${invalidCoords.length} trails with invalid coordinates:`);
    invalidCoords.slice(0, 5).forEach(t =>
      console.log(`      - ${t.name}: [${t.latitude}, ${t.longitude}] (${t.parkName || 'No park'})`)
    );
    if (invalidCoords.length > 5) console.log(`      ... and ${invalidCoords.length - 5} more`);
  } else {
    console.log('   ✅ All trails have valid coordinates');
  }

  // 3. Find trails with no name
  console.log('\n3️⃣  Checking for trails with no name...');
  const noName = await prisma.hike.findMany({
    where: {
      name: {
        in: ['', 'null'],
      },
    },
    select: { id: true, name: true, parkName: true },
  });
  stats.noName = noName.length;
  if (noName.length > 0) {
    console.log(`   ⚠️  Found ${noName.length} trails with no name`);
  } else {
    console.log('   ✅ All trails have names');
  }

  // 4. Find trails with generic names (exact match only)
  console.log('\n4️⃣  Checking for generic trail names...');
  const genericNames = await prisma.hike.findMany({
    where: {
      OR: GENERIC_NAMES.map(name => ({ name: { equals: name, mode: 'insensitive' as const } })),
    },
    select: { id: true, name: true, parkName: true },
  });
  stats.genericNames = genericNames.length;
  if (genericNames.length > 0) {
    console.log(`   ⚠️  Found ${genericNames.length} trails with generic names:`);
    genericNames.slice(0, 5).forEach(t => console.log(`      - ${t.name} (${t.parkName || 'No park'})`));
    if (genericNames.length > 5) console.log(`      ... and ${genericNames.length - 5} more`);
  } else {
    console.log('   ✅ No generic trail names found');
  }

  // 5. Find trails with no distance or elevation
  console.log('\n5️⃣  Checking for trails with no distance data...');
  const noDistance = await prisma.hike.findMany({
    where: {
      distanceMiles: {
        lte: 0,
      },
    },
    select: { id: true, name: true, distanceMiles: true, parkName: true },
  });
  stats.noDistance = noDistance.length;
  if (noDistance.length > 0) {
    console.log(`   ⚠️  Found ${noDistance.length} trails with no distance data:`);
    noDistance.slice(0, 5).forEach(t =>
      console.log(`      - ${t.name}: ${t.distanceMiles}mi (${t.parkName || 'No park'})`)
    );
    if (noDistance.length > 5) console.log(`      ... and ${noDistance.length - 5} more`);
  } else {
    console.log('   ✅ All trails have distance data');
  }

  // 6. Find trails with no park name
  console.log('\n6️⃣  Checking for trails with no park name...');
  const noParkName = await prisma.hike.findMany({
    where: {
      parkName: null,
    },
    select: { id: true, name: true, parkName: true },
  });
  stats.noParkName = noParkName.length;
  if (noParkName.length > 0) {
    console.log(`   ⚠️  Found ${noParkName.length} trails with no park name:`);
    noParkName.slice(0, 5).forEach(t => console.log(`      - ${t.name}`));
    if (noParkName.length > 5) console.log(`      ... and ${noParkName.length - 5} more`);
  } else {
    console.log('   ✅ All trails have park names');
  }

  // Collect all IDs to delete (remove duplicates)
  const idsToDelete = new Set<number>();

  seedTrails.forEach(t => idsToDelete.add(t.id));
  invalidCoords.forEach(t => idsToDelete.add(t.id));
  noName.forEach(t => idsToDelete.add(t.id));
  genericNames.forEach(t => idsToDelete.add(t.id));
  noDistance.forEach(t => idsToDelete.add(t.id));
  noParkName.forEach(t => idsToDelete.add(t.id));

  stats.totalRemoved = idsToDelete.size;

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 CLEANUP SUMMARY\n');
  console.log(`Total trails before:           ${stats.totalBefore}`);
  console.log(`Seed trails:                   ${stats.seedTrails}`);
  console.log(`Invalid coordinates:           ${stats.invalidCoordinates}`);
  console.log(`No name:                       ${stats.noName}`);
  console.log(`Generic names:                 ${stats.genericNames}`);
  console.log(`No distance data:              ${stats.noDistance}`);
  console.log(`No park name:                  ${stats.noParkName}`);
  console.log('-'.repeat(80));
  console.log(`Total to remove (deduplicated): ${stats.totalRemoved}`);
  console.log(`Total remaining:                ${stats.totalBefore - stats.totalRemoved}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No data was deleted');
    console.log('   Run with --live flag to actually delete the data\n');
  } else {
    console.log('\n⚠️  LIVE MODE - Deleting data in 3 seconds...');
    console.log('   Press Ctrl+C to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all junk trails
    console.log('🗑️  Deleting junk trails...');
    const deleteResult = await prisma.hike.deleteMany({
      where: {
        id: {
          in: Array.from(idsToDelete),
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} trails\n`);

    // Get final count
    stats.totalAfter = await prisma.hike.count();
    console.log(`📊 Total trails after cleanup: ${stats.totalAfter}\n`);

    // Show remaining trails by park
    console.log('Remaining trails by park:\n');
    const remainingTrails = await prisma.hike.groupBy({
      by: ['parkName'],
      _count: true,
    });

    remainingTrails
      .sort((a, b) => b._count - a._count)
      .forEach(park => {
        if (park.parkName) {
          console.log(`  ${park.parkName.padEnd(40)} ${park._count} trails`);
        }
      });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Cleanup complete!\n');

  await prisma.$disconnect();
}

// Parse command line arguments
const args = process.argv.slice(2);
const isLive = args.includes('--live');

cleanupDatabase(!isLive).catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
