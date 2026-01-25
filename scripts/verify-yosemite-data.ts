/**
 * Verify Yosemite data in database
 */

import { prisma } from '../src/lib/db';

async function main() {
  console.log('\n🔍 Verifying Yosemite Trail Data in Database\n');
  console.log('='.repeat(80));

  try {
    // Count total Yosemite trails
    const totalCount = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
      },
    });

    console.log(`\n📊 Total Yosemite Trails: ${totalCount}`);

    // Count by source
    const osmCount = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
        sourceUrl: {
          contains: 'openstreetmap',
        },
      },
    });

    console.log(`   - From OpenStreetMap: ${osmCount}`);
    console.log(`   - From other sources: ${totalCount - osmCount}`);

    // Get recently added trails (last enriched today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentCount = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
        lastEnriched: {
          gte: today,
        },
      },
    });

    console.log(`\n✅ Trails added today: ${recentCount}`);

    // Get sample trails
    const sampleTrails = await prisma.hike.findMany({
      where: {
        parkName: 'Yosemite National Park',
        lastEnriched: {
          gte: today,
        },
      },
      take: 10,
      orderBy: {
        elevationGainFt: 'desc',
      },
    });

    console.log(`\n🏔️  Top 10 Trails by Elevation Gain:\n`);
    sampleTrails.forEach((trail, i) => {
      console.log(`   ${i + 1}. ${trail.name}`);
      console.log(`      Distance: ${trail.distanceMiles} mi | Elevation: ${trail.elevationGainFt} ft`);
      console.log(`      Difficulty: ${trail.difficulty || 'N/A'} | Type: ${trail.trailType || 'N/A'}`);
      console.log(`      GPS: ${trail.coordinates ? 'Yes' : 'No'} | Profile Points: ${Array.isArray(trail.profilePoints) ? (trail.profilePoints as any).length : 0}`);
      console.log();
    });

    // Data quality checks
    console.log(`\n🔍 Data Quality Checks:\n`);

    const withGPS = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
        lastEnriched: { gte: today },
        coordinates: { not: null },
      },
    });

    const withDifficulty = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
        lastEnriched: { gte: today },
        difficulty: { not: null },
      },
    });

    const withDescription = await prisma.hike.count({
      where: {
        parkName: 'Yosemite National Park',
        lastEnriched: { gte: today },
        description: { not: null },
      },
    });

    console.log(`   ✅ Trails with GPS coordinates: ${withGPS}/${recentCount} (${((withGPS / recentCount) * 100).toFixed(1)}%)`);
    console.log(`   ✅ Trails with difficulty rating: ${withDifficulty}/${recentCount} (${((withDifficulty / recentCount) * 100).toFixed(1)}%)`);
    console.log(`   ✅ Trails with description: ${withDescription}/${recentCount} (${((withDescription / recentCount) * 100).toFixed(1)}%)`);

    // Check for duplicates
    const duplicates = await prisma.$queryRaw<Array<{ name: string; count: number }>>`
      SELECT name, COUNT(*) as count
      FROM "Hike"
      WHERE "parkName" = 'Yosemite National Park'
      GROUP BY name
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} potential duplicates:`);
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`   - "${dup.name}" (${dup.count} times)`);
      });
    } else {
      console.log(`\n✅ No duplicates found!`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ Verification Complete!\n`);

    if (recentCount > 0) {
      console.log(`💡 Next Steps:`);
      console.log(`   1. Check Prisma Studio: npm run db:studio`);
      console.log(`   2. Review data files: data/raw/, data/validated/, data/results/`);
      console.log(`   3. If data looks good, proceed with remaining 9 parks!\n`);
    } else {
      console.log(`⚠️  No trails found from today. Collection may still be running.\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
