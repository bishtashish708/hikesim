/**
 * Enrich existing hikes in database with missing metadata
 * Usage: npm run trails:enrich
 */

import { enrichExistingHikes, validateTrailData } from '../src/lib/trail-data/trail-enricher';

async function main() {
  console.log('\n🔄 Enriching existing hikes in database...\n');

  try {
    // Show current state
    console.log('Current data quality:');
    const beforeStats = await validateTrailData();
    console.log(`  Total hikes: ${beforeStats.total}`);
    console.log(`  With elevation: ${beforeStats.withElevation} (${Math.round((beforeStats.withElevation / beforeStats.total) * 100)}%)`);
    console.log(`  With difficulty: ${beforeStats.withDifficulty} (${Math.round((beforeStats.withDifficulty / beforeStats.total) * 100)}%)`);
    console.log(`  With coordinates: ${beforeStats.withCoordinates} (${Math.round((beforeStats.withCoordinates / beforeStats.total) * 100)}%)`);
    console.log(`  With trail type: ${beforeStats.withType} (${Math.round((beforeStats.withType / beforeStats.total) * 100)}%)`);
    console.log(`  Overall quality score: ${beforeStats.qualityScore}%\n`);

    // Enrich missing data
    const enrichedCount = await enrichExistingHikes();

    // Show results
    console.log('\n✅ Enrichment complete!\n');
    console.log('Updated data quality:');
    const afterStats = await validateTrailData();
    console.log(`  Total hikes: ${afterStats.total}`);
    console.log(`  With elevation: ${afterStats.withElevation} (${Math.round((afterStats.withElevation / afterStats.total) * 100)}%)`);
    console.log(`  With difficulty: ${afterStats.withDifficulty} (${Math.round((afterStats.withDifficulty / afterStats.total) * 100)}%)`);
    console.log(`  With coordinates: ${afterStats.withCoordinates} (${Math.round((afterStats.withCoordinates / afterStats.total) * 100)}%)`);
    console.log(`  With trail type: ${afterStats.withType} (${Math.round((afterStats.withType / afterStats.total) * 100)}%)`);
    console.log(`  Overall quality score: ${afterStats.qualityScore}%`);
    console.log(`  Improvement: +${afterStats.qualityScore - beforeStats.qualityScore}%\n`);

    console.log(`\nEnriched ${enrichedCount} hikes with missing metadata.`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
