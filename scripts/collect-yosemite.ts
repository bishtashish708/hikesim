/**
 * CLI Script: Collect Yosemite trails using AI agents
 *
 * Usage:
 *   npm run collect:yosemite          # Dry run (no database writes)
 *   npm run collect:yosemite -- --live # Live mode (writes to database)
 */

import { TrailCollectionOrchestrator } from '../src/agents/orchestrator';

async function main() {
  // Get OpenRouter API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: OPENROUTER_API_KEY environment variable not set');
    console.error('\nTo fix this:');
    console.error('1. Get an API key from https://openrouter.ai/');
    console.error('2. Add credits to your account ($5 minimum)');
    console.error('3. Set environment variable: export OPENROUTER_API_KEY="your-key"');
    console.error('4. Or add to .env.local: OPENROUTER_API_KEY=your-key\n');
    process.exit(1);
  }

  // Check for --live flag
  const isLive = process.argv.includes('--live');
  const dryRun = !isLive;

  console.log('\n🏔️  Yosemite Trail Collection');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no database writes)' : '🔴 LIVE (will write to database)'}\n`);

  if (!dryRun) {
    console.log('⚠️  WARNING: This will insert trails into your database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const orchestrator = new TrailCollectionOrchestrator(apiKey);

    const result = await orchestrator.collectAndInsertTrailsForPark(
      'Yosemite National Park',
      'yose',
      {
        dryRun,
        batchSize: 50,
        minQualityScore: 50, // Only trails with 50+ quality score
      }
    );

    console.log('\n✅ Script complete!');
    console.log(`\nFinal stats:`);
    console.log(`  - Attempted: ${result.attempted}`);
    console.log(`  - Inserted: ${result.inserted}`);
    console.log(`  - Skipped: ${result.skipped}`);
    console.log(`  - Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log(`\nErrors:`);
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
