/**
 * Add Elevation Profiles to Existing Trails
 * Much faster than re-importing everything
 *
 * Run: npx tsx scripts/add-elevation-profiles.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';

function generateProfilePoints(
  distanceMiles: number,
  elevationGainFt: number,
  routeType: string
): Array<{ distanceMiles: number; elevationFt: number }> {
  const numPoints = Math.min(100, Math.max(20, Math.floor(distanceMiles * 5)));
  const points: Array<{ distanceMiles: number; elevationFt: number }> = [];
  const startElevation = 5000;

  if (routeType.toLowerCase().includes('loop')) {
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const distance = distanceMiles * progress;

      let elevationFactor: number;
      if (progress < 0.4) {
        elevationFactor = Math.sin(progress * Math.PI * 1.25);
      } else if (progress < 0.7) {
        elevationFactor = 0.95 + Math.sin(progress * Math.PI * 10) * 0.05;
      } else {
        elevationFactor = Math.sin((1 - progress) * Math.PI * 1.25);
      }

      const elevation = startElevation + elevationGainFt * elevationFactor;
      points.push({ distanceMiles: distance, elevationFt: Math.round(elevation) });
    }
  } else if (routeType.toLowerCase().includes('point')) {
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const distance = distanceMiles * progress;

      const elevation =
        startElevation +
        elevationGainFt * progress +
        Math.sin(progress * Math.PI * 6) * (elevationGainFt * 0.1);

      points.push({ distanceMiles: distance, elevationFt: Math.round(elevation) });
    }
  } else {
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const distance = distanceMiles * progress;

      let elevationFactor: number;
      if (progress <= 0.5) {
        elevationFactor = Math.sin(progress * Math.PI);
      } else {
        elevationFactor = Math.sin((1 - progress) * Math.PI);
      }

      const elevation = startElevation + elevationGainFt * elevationFactor;
      points.push({ distanceMiles: distance, elevationFt: Math.round(elevation) });
    }
  }

  return points;
}

async function addProfiles() {
  console.log('\n🎨 Adding Elevation Profiles to Existing Trails\n');

  const trails = await prisma.hike.findMany({
    where: {
      isSeed: false,
      // Only update trails with empty or minimal profiles
      OR: [
        { profilePoints: { equals: [] } },
        { profilePoints: { equals: null } },
      ],
    },
    select: {
      id: true,
      distanceMiles: true,
      elevationGainFt: true,
      trailType: true,
      name: true,
    },
  });

  console.log(`Found ${trails.length} trails needing elevation profiles\n`);

  let updated = 0;

  for (const trail of trails) {
    const profilePoints = generateProfilePoints(
      trail.distanceMiles,
      trail.elevationGainFt,
      trail.trailType || 'Out And Back'
    );

    await prisma.hike.update({
      where: { id: trail.id },
      data: { profilePoints },
    });

    updated++;

    if (updated % 100 === 0) {
      console.log(`   Updated ${updated} trails...`);
    }
  }

  console.log(`\n✅ Added profiles to ${updated} trails\n`);

  await prisma.$disconnect();
}

addProfiles().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
