/**
 * Import India Trails to Database
 * Uses scraped data from India Hikes
 *
 * Run: npx tsx scripts/import-india-trails.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface IndiaTrail {
  name: string;
  state: string;
  region: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  difficulty?: string;
  description?: string;
  url: string;
}

// Estimated data based on typical Himalayan treks
function estimateTrailData(trail: IndiaTrail): {
  distanceMiles: number;
  elevationGainFt: number;
  profilePoints: Array<{ distanceMiles: number; elevationFt: number }>;
} {
  // Estimate based on difficulty and typical Himalayan trek characteristics
  let distanceMiles: number;
  let elevationGainFt: number;

  const difficulty = trail.difficulty || 'Moderate';

  if (difficulty === 'Easy') {
    distanceMiles = 4 + Math.random() * 6; // 4-10 miles
    elevationGainFt = 1000 + Math.random() * 2000; // 1000-3000 ft
  } else if (difficulty === 'Moderate') {
    distanceMiles = 8 + Math.random() * 12; // 8-20 miles
    elevationGainFt = 3000 + Math.random() * 4000; // 3000-7000 ft
  } else {
    // Hard/Difficult
    distanceMiles = 15 + Math.random() * 25; // 15-40 miles
    elevationGainFt = 5000 + Math.random() * 8000; // 5000-13000 ft
  }

  // Generate profile points
  const profilePoints = generateProfilePoints(distanceMiles, elevationGainFt, 'Out And Back');

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    elevationGainFt: Math.round(elevationGainFt),
    profilePoints,
  };
}

function generateProfilePoints(
  distanceMiles: number,
  elevationGainFt: number,
  routeType: string
): Array<{ distanceMiles: number; elevationFt: number }> {
  const numPoints = Math.min(100, Math.max(20, Math.floor(distanceMiles * 5)));
  const points: Array<{ distanceMiles: number; elevationFt: number }> = [];
  const startElevation = 5000; // Base elevation for Himalayas

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

  return points;
}

async function importIndiaTrails() {
  console.log('\n🇮🇳 IMPORTING INDIA TRAILS\n');
  console.log('='.repeat(80) + '\n');

  // Find the latest scraped data
  const rawDir = 'data/raw';
  const files = fs.readdirSync(rawDir).filter((f) => f.startsWith('india-hikes'));

  if (files.length === 0) {
    console.error('❌ No scraped data found. Run scrape-india-hikes-v2.ts first.');
    process.exit(1);
  }

  const latestFile = files.sort().reverse()[0];
  const filePath = path.join(rawDir, latestFile);

  console.log(`📄 Loading data from: ${latestFile}\n`);

  const trails: IndiaTrail[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`Found ${trails.length} trails to import\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const trail of trails) {
    try {
      // Check if trail exists
      const existing = await prisma.hike.findFirst({
        where: {
          name: trail.name,
          stateCode: trail.state,
          countryCode: 'IN',
        },
      });

      // Estimate missing data
      const estimated = estimateTrailData(trail);

      const trailData = {
        name: trail.name,
        distanceMiles: trail.distanceMiles || estimated.distanceMiles,
        elevationGainFt: trail.elevationGainFt || estimated.elevationGainFt,
        profilePoints: estimated.profilePoints,
        countryCode: 'IN',
        stateCode: trail.state === 'Uttarakhand' ? 'UK' : 'HP',
        isSeed: false,
        region: trail.region,
        difficulty: trail.difficulty || 'Moderate',
        trailType: 'Out And Back',
        description: trail.description || `${trail.name} in ${trail.state}, India`,
        sourceUrl: trail.url,
        lastEnriched: new Date(),
      };

      if (existing) {
        await prisma.hike.update({
          where: { id: existing.id },
          data: trailData,
        });
        updated++;
      } else {
        await prisma.hike.create({
          data: trailData,
        });
        inserted++;
      }

      if ((inserted + updated) % 10 === 0) {
        console.log(`   Processed ${inserted + updated} trails...`);
      }
    } catch (error) {
      console.error(`❌ Error importing ${trail.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   New trails: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}\n`);

  // Show breakdown by state
  const byState = await prisma.hike.groupBy({
    by: ['stateCode'],
    where: { countryCode: 'IN' },
    _count: true,
  });

  console.log('📍 India Trails by State:\n');
  byState.forEach((state) => {
    const stateName = state.stateCode === 'UK' ? 'Uttarakhand' : 'Himachal Pradesh';
    console.log(`   ${stateName}: ${state._count} trails`);
  });

  const total = byState.reduce((sum, s) => sum + s._count, 0);
  console.log(`\n   TOTAL: ${total} India trails\n`);

  await prisma.$disconnect();
}

importIndiaTrails().catch((error) => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
