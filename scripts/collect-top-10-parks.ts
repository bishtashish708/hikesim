/**
 * CLI Script: Collect trails from Top 10 Most Visited US National Parks
 *
 * Expected: 10-15K trails total
 * Estimated cost: $20-40 total
 *
 * Usage:
 *   npm run collect:top10           # Dry run (no database writes)
 *   npm run collect:top10 -- --live # Live mode (writes to database)
 */

import { TrailCollectionOrchestrator } from '../src/agents/orchestrator';

// Top 10 most visited US National Parks (2023 data)
const TOP_10_PARKS = [
  { name: 'Great Smoky Mountains National Park', code: 'grsm', visitors: '12.9M' },
  { name: 'Grand Canyon National Park', code: 'grca', visitors: '4.7M' },
  { name: 'Zion National Park', code: 'zion', visitors: '4.6M' },
  { name: 'Rocky Mountain National Park', code: 'romo', visitors: '4.3M' },
  { name: 'Acadia National Park', code: 'acad', visitors: '3.9M' },
  { name: 'Grand Teton National Park', code: 'grte', visitors: '3.4M' },
  { name: 'Olympic National Park', code: 'olym', visitors: '3.2M' },
  { name: 'Yellowstone National Park', code: 'yell', visitors: '3.0M' },
  { name: 'Yosemite National Park', code: 'yose', visitors: '3.0M' },
  { name: 'Glacier National Park', code: 'glac', visitors: '2.9M' },
];

async function main() {
  // Get OpenRouter API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: OPENROUTER_API_KEY environment variable not set');
    console.error('\nTo fix this:');
    console.error('1. Get an API key from https://openrouter.ai/');
    console.error('2. Add credits to your account ($30+ recommended)');
    console.error('3. Set environment variable: export OPENROUTER_API_KEY="your-key"');
    console.error('4. Or add to .env: OPENROUTER_API_KEY=your-key\n');
    process.exit(1);
  }

  // Check for --live flag
  const isLive = process.argv.includes('--live');
  const dryRun = !isLive;

  // Check for specific park
  const specificPark = process.argv.find(arg => arg.startsWith('--park='));
  const parkFilter = specificPark ? specificPark.split('=')[1] : null;

  const parksToProcess = parkFilter
    ? TOP_10_PARKS.filter(p => p.code === parkFilter || p.name.toLowerCase().includes(parkFilter.toLowerCase()))
    : TOP_10_PARKS;

  if (parksToProcess.length === 0) {
    console.error(`❌ No parks found matching: ${parkFilter}`);
    process.exit(1);
  }

  console.log('\n🏔️  Top 10 National Parks Trail Collection');
  console.log(`📊 Parks to process: ${parksToProcess.length}`);
  console.log(`🔄 Mode: ${dryRun ? '🔍 DRY RUN (no database writes)' : '🔴 LIVE (will write to database)'}`);
  console.log(`💰 Estimated cost: $${(parksToProcess.length * 3).toFixed(0)}-${(parksToProcess.length * 5).toFixed(0)}\n`);

  if (!dryRun) {
    console.log('⚠️  WARNING: This will insert trails into your database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const orchestrator = new TrailCollectionOrchestrator(apiKey);

  // Summary tracking
  const summary = {
    totalParks: parksToProcess.length,
    successfulParks: 0,
    failedParks: 0,
    totalCollected: 0,
    totalInserted: 0,
    totalSkipped: 0,
    totalFailed: 0,
    parkResults: [] as Array<{
      park: string;
      collected: number;
      inserted: number;
      skipped: number;
      failed: number;
    }>,
    errors: [] as string[],
  };

  const startTime = Date.now();

  // Process each park sequentially
  for (let i = 0; i < parksToProcess.length; i++) {
    const park = parksToProcess[i];

    console.log(`\n\n${'█'.repeat(80)}`);
    console.log(`🏞️  PARK ${i + 1}/${parksToProcess.length}: ${park.name}`);
    console.log(`📈 Annual Visitors: ${park.visitors}`);
    console.log(`${'█'.repeat(80)}\n`);

    try {
      const result = await orchestrator.collectAndInsertTrailsForPark(
        park.name,
        park.code,
        {
          dryRun,
          batchSize: 50,
          minQualityScore: 50, // Only high-quality trails
        }
      );

      summary.successfulParks++;
      summary.totalCollected += result.attempted;
      summary.totalInserted += result.inserted;
      summary.totalSkipped += result.skipped;
      summary.totalFailed += result.failed;

      summary.parkResults.push({
        park: park.name,
        collected: result.attempted,
        inserted: result.inserted,
        skipped: result.skipped,
        failed: result.failed,
      });

      if (result.errors.length > 0) {
        summary.errors.push(`${park.name}: ${result.errors.join(', ')}`);
      }

      console.log(`\n✅ ${park.name} complete!`);
      console.log(`   Collected: ${result.attempted} | Inserted: ${result.inserted} | Skipped: ${result.skipped}\n`);

      // Rate limiting: wait 2 seconds between parks to be nice to OSM API
      if (i < parksToProcess.length - 1) {
        console.log('⏱️  Waiting 2 seconds before next park...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`\n❌ Failed to process ${park.name}:`, error);
      summary.failedParks++;
      summary.errors.push(`${park.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Final Summary
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log(`🎉 COLLECTION COMPLETE - ALL ${parksToProcess.length} PARKS PROCESSED`);
  console.log(`${'═'.repeat(80)}\n`);

  console.log(`📊 Overall Summary:`);
  console.log(`   ✅ Successful parks: ${summary.successfulParks}/${summary.totalParks}`);
  console.log(`   ❌ Failed parks: ${summary.failedParks}/${summary.totalParks}`);
  console.log(`   📥 Total trails collected: ${summary.totalCollected}`);
  console.log(`   💾 Total trails inserted: ${summary.totalInserted}`);
  console.log(`   ⏭️  Total trails skipped: ${summary.totalSkipped}`);
  console.log(`   ❌ Total trails failed: ${summary.totalFailed}`);
  console.log(`   ⏱️  Total time: ${duration} minutes\n`);

  if (summary.parkResults.length > 0) {
    console.log(`📋 Breakdown by Park:\n`);
    summary.parkResults.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.park}`);
      console.log(`      Collected: ${result.collected} | Inserted: ${result.inserted} | Skipped: ${result.skipped}`);
    });
  }

  if (summary.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    summary.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (summary.errors.length > 10) {
      console.log(`   ... and ${summary.errors.length - 10} more`);
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`💡 Next Steps:`);
  console.log(`   1. Check your database: npm run db:studio`);
  console.log(`   2. Review data files in: data/raw/, data/validated/, data/results/`);
  console.log(`   3. Test your app to see the new trails!`);
  console.log(`${'═'.repeat(80)}\n`);

  process.exit(summary.failedParks > 0 ? 1 : 0);
}

main();
