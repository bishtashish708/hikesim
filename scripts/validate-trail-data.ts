/**
 * Validate trail data quality
 * Usage: npm run trails:validate
 */

import { validateTrailData } from '../src/lib/trail-data/trail-enricher';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 Validating trail data quality...\n');

  try {
    const stats = await validateTrailData();

    console.log('='.repeat(50));
    console.log('TRAIL DATA QUALITY REPORT');
    console.log('='.repeat(50));
    console.log();
    console.log(`Total Hikes: ${stats.total}`);
    console.log();
    console.log('Data Completeness:');
    console.log(`  ✓ With Elevation Data: ${stats.withElevation}/${stats.total} (${Math.round((stats.withElevation / stats.total) * 100)}%)`);
    console.log(`  ✓ With Difficulty Rating: ${stats.withDifficulty}/${stats.total} (${Math.round((stats.withDifficulty / stats.total) * 100)}%)`);
    console.log(`  ✓ With GPS Coordinates: ${stats.withCoordinates}/${stats.total} (${Math.round((stats.withCoordinates / stats.total) * 100)}%)`);
    console.log(`  ✓ With Trail Type: ${stats.withType}/${stats.total} (${Math.round((stats.withType / stats.total) * 100)}%)`);
    console.log();
    console.log(`Overall Quality Score: ${stats.qualityScore}%`);
    console.log();

    // Quality assessment
    if (stats.qualityScore >= 90) {
      console.log('✅ EXCELLENT - Trail data is high quality!');
    } else if (stats.qualityScore >= 75) {
      console.log('✓ GOOD - Trail data quality is acceptable.');
    } else if (stats.qualityScore >= 50) {
      console.log('⚠️  FAIR - Consider enriching more trails.');
    } else {
      console.log('❌ POOR - Significant enrichment needed.');
    }

    console.log();
    console.log('='.repeat(50));

    // Show sample trails
    console.log('\nSample Trails:');
    const sampleTrails = await prisma.hike.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        distanceMiles: true,
        elevationGainFt: true,
        difficulty: true,
        trailType: true,
        stateCode: true,
        countryCode: true,
      },
    });

    sampleTrails.forEach((trail, i) => {
      console.log(`\n${i + 1}. ${trail.name}`);
      console.log(`   Location: ${trail.stateCode || 'Unknown'}, ${trail.countryCode}`);
      console.log(`   Distance: ${trail.distanceMiles.toFixed(1)} mi`);
      console.log(`   Elevation Gain: ${trail.elevationGainFt} ft`);
      console.log(`   Difficulty: ${trail.difficulty || 'Not rated'}`);
      console.log(`   Type: ${trail.trailType || 'Unknown'}`);
    });

    console.log();
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
