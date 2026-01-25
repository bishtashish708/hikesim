/**
 * Verify all collected trail data in the database
 */

import { prisma } from '../src/lib/db';

async function verifyData() {
  console.log('\n📊 DATABASE VERIFICATION\n' + '='.repeat(80) + '\n');

  // Get all trails grouped by park
  const allTrails = await prisma.hike.findMany({
    where: { isSeed: false },
    select: {
      parkName: true,
      name: true,
      distanceMiles: true,
      elevationGainFt: true,
      difficulty: true,
      latitude: true,
      longitude: true,
    },
  });

  // Group by park
  const parkMap = new Map<string, any[]>();
  for (const trail of allTrails) {
    const parkName = trail.parkName || 'Unknown Park';
    if (!parkMap.has(parkName)) {
      parkMap.set(parkName, []);
    }
    parkMap.get(parkName)!.push(trail);
  }

  // Calculate stats
  console.log('Trail Count by Park:\n');
  const parkStats = Array.from(parkMap.entries())
    .map(([park, trails]) => {
      const avgDist = (trails.reduce((sum, t) => sum + (t.distanceMiles || 0), 0) / trails.length).toFixed(2);
      const avgElev = (trails.reduce((sum, t) => sum + (t.elevationGainFt || 0), 0) / trails.length).toFixed(0);
      const difficulties = {
        easy: trails.filter(t => t.difficulty === 'Easy').length,
        moderate: trails.filter(t => t.difficulty === 'Moderate').length,
        hard: trails.filter(t => t.difficulty === 'Hard').length,
        veryHard: trails.filter(t => t.difficulty === 'Very Hard').length,
      };
      return { park, count: trails.length, avgDist, avgElev, difficulties };
    })
    .sort((a, b) => b.count - a.count);

  let total = 0;
  for (const stat of parkStats) {
    console.log(`  ${stat.park.padEnd(40)} ${String(stat.count).padStart(4)} trails | Avg: ${stat.avgDist}mi, ${stat.avgElev}ft`);
    total += stat.count;
  }
  console.log('\n' + '-'.repeat(80));
  console.log(`  TOTAL TRAILS: ${total}\n`);

  // Difficulty breakdown
  console.log('Difficulty Distribution:\n');
  for (const stat of parkStats) {
    console.log(`  ${stat.park.padEnd(40)} E:${stat.difficulties.easy} M:${stat.difficulties.moderate} H:${stat.difficulties.hard} VH:${stat.difficulties.veryHard}`);
  }

  // Sample trails
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('Sample Trails (5 most recent):\n');
  const samples = allTrails.slice(0, 5);

  for (const trail of samples) {
    console.log(`  ✓ ${trail.name}`);
    console.log(`    Park: ${trail.parkName} | ${trail.distanceMiles}mi | ${trail.elevationGainFt}ft | ${trail.difficulty || 'N/A'}`);
    console.log(`    Coords: [${trail.latitude}, ${trail.longitude}]\n`);
  }

  console.log('\n✅ Database verification complete!\n');

  await prisma.$disconnect();
}

verifyData().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
