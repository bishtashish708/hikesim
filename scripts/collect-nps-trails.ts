/**
 * Collect trails from NPS API with progress bars
 */

import { NPSCollectionAgent, ProgressCallback } from '../src/agents/collector/nps-collector';
import { DataValidationAgent } from '../src/agents/validator/agent';
import { prisma } from '../src/lib/db';

// Park configuration
const PARKS = [
  { name: 'Yosemite National Park', code: 'yose' },
  { name: 'Great Smoky Mountains National Park', code: 'grsm' },
  { name: 'Grand Canyon National Park', code: 'grca' },
  { name: 'Zion National Park', code: 'zion' },
  { name: 'Rocky Mountain National Park', code: 'romo' },
  { name: 'Acadia National Park', code: 'acad' },
  { name: 'Grand Teton National Park', code: 'grte' },
  { name: 'Olympic National Park', code: 'olym' },
  { name: 'Yellowstone National Park', code: 'yell' },
  { name: 'Glacier National Park', code: 'glac' },
];

// Budget tracking
const MAX_BUDGET = 40; // Maximum $40 total
let totalCostSoFar = 0;

async function main() {
  const args = process.argv.slice(2);
  const isLiveMode = args.includes('--live');
  const parkFilter = args.find(arg => arg.startsWith('--park='))?.split('=')[1];

  console.log('\n🏔️  NPS Trail Collection System');
  console.log(`Mode: ${isLiveMode ? '🔴 LIVE (will write to database)' : '🟡 DRY RUN (preview only)'}`);
  console.log(`Budget: $${MAX_BUDGET} max`);

  // Get API keys
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const npsKey = process.env.NPS_API_KEY;

  if (!openRouterKey || !npsKey) {
    console.error('\n❌ Missing API keys!');
    console.error('   Set OPENROUTER_API_KEY and NPS_API_KEY in .env file');
    process.exit(1);
  }

  // Initialize agents
  const collector = new NPSCollectionAgent(openRouterKey, npsKey);
  const validator = new DataValidationAgent(openRouterKey);

  // Filter parks if specified
  let parksToProcess = PARKS;
  if (parkFilter) {
    parksToProcess = PARKS.filter(
      p => p.code === parkFilter || p.name.toLowerCase().includes(parkFilter.toLowerCase())
    );

    if (parksToProcess.length === 0) {
      console.error(`\n❌ No park found matching "${parkFilter}"`);
      process.exit(1);
    }
  }

  console.log(`\n📍 Processing ${parksToProcess.length} park(s):`);
  parksToProcess.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.code})`));

  if (isLiveMode) {
    console.log('\n⚠️  WARNING: This will insert trails into your database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Process each park
  for (let parkIdx = 0; parkIdx < parksToProcess.length; parkIdx++) {
    const park = parksToProcess[parkIdx];

    console.log('\n' + '='.repeat(80));
    console.log(`🏞️  [${parkIdx + 1}/${parksToProcess.length}] ${park.name.toUpperCase()}`);
    console.log('='.repeat(80));

    try {
      // === PHASE 1: COLLECTION ===
      console.log('\n📥 PHASE 1: DATA COLLECTION');
      console.log('─'.repeat(80));

      const progressCallback: ProgressCallback = (phase, current, total, message) => {
        if (phase === 'fetch') {
          const bar = createProgressBar(current, total, 30);
          process.stdout.write(`\r  ${bar} Fetching from NPS API... ${current}/${total}    `);
          if (current === total) console.log();
        } else if (phase === 'enrich') {
          const bar = createProgressBar(current, total, 30);
          const msg = message?.substring(0, 40).padEnd(40);
          process.stdout.write(`\r  ${bar} Enriching: ${msg} ${current}/${total}    `);
          if (current === total) console.log();
        } else if (phase === 'complete') {
          console.log(`\n✅ ${message}`);
        }
      };

      const collectionResult = await collector.collectTrailsForPark(
        park.name,
        park.code,
        progressCallback
      );

      console.log(`\n📊 Collection Results:`);
      console.log(`   - Trails found: ${collectionResult.trailsFound}`);
      console.log(`   - Source: ${collectionResult.source}`);
      if (collectionResult.errors.length > 0) {
        console.log(`   - Errors: ${collectionResult.errors.length}`);
      }

      if (collectionResult.trailsFound === 0) {
        console.log('\n⚠️  No trails found, skipping validation.');
        continue;
      }

      // === PHASE 2: VALIDATION ===
      console.log('\n✅ PHASE 2: AI VALIDATION');
      console.log('─'.repeat(80));

      const validationResult = await validator.validateTrails(collectionResult.trails);

      console.log(`\n📊 Validation Results:`);
      console.log(`   - Valid trails: ${validationResult.summary.passed}`);
      console.log(`   - Invalid trails: ${validationResult.summary.failed}`);
      console.log(`   - Duplicates: ${validationResult.summary.duplicates}`);
      console.log(`   - Avg quality score: ${validationResult.summary.averageQualityScore.toFixed(1)}/100`);

      // === PHASE 3: DATABASE INSERTION ===
      if (isLiveMode && validationResult.validTrails.length > 0) {
        console.log('\n💾 PHASE 3: DATABASE INSERTION');
        console.log('─'.repeat(80));

        let inserted = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < validationResult.validTrails.length; i++) {
          const trail = validationResult.validTrails[i];

          const bar = createProgressBar(i + 1, validationResult.validTrails.length, 30);
          process.stdout.write(`\r  ${bar} Inserting trails... ${i + 1}/${validationResult.validTrails.length}    `);

          try {
            // Check for duplicates
            const existing = await prisma.hike.findFirst({
              where: {
                name: trail.name,
                parkName: trail.parkName,
              },
            });

            if (existing) {
              skipped++;
            } else {
              await prisma.hike.create({
                data: {
                  name: trail.name,
                  slug: trail.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                  distanceMiles: trail.distanceMiles,
                  elevationGainFt: trail.elevationGainFt,
                  difficulty: trail.difficulty,
                  trailType: trail.trailType,
                  description: trail.description || '',
                  parkName: trail.parkName,
                  stateCode: trail.stateCode,
                  countryCode: trail.countryCode,
                  latitude: trail.latitude,
                  longitude: trail.longitude,
                  coordinates: trail.coordinates as any,
                  profilePoints: trail.profilePoints as any,
                  surface: trail.surface,
                  sourceUrl: trail.sourceUrl,
                  lastEnriched: new Date(),
                  isSeed: false,
                },
              });
              inserted++;
            }
          } catch (error) {
            failed++;
            console.error(`\n    ✗ Failed to insert ${trail.name}:`, error);
          }
        }

        console.log(`\n\n✅ Database insertion complete!`);
        console.log(`   - Inserted: ${inserted}`);
        console.log(`   - Skipped (duplicates): ${skipped}`);
        console.log(`   - Failed: ${failed}`);
      }

      // Budget check
      console.log(`\n💰 Cost tracking:`);
      console.log(`   - This park: (estimated $0.50-2.00)`);
      console.log(`   - Total so far: $${totalCostSoFar.toFixed(2)}`);
      console.log(`   - Remaining budget: $${(MAX_BUDGET - totalCostSoFar).toFixed(2)}`);

      if (totalCostSoFar >= MAX_BUDGET) {
        console.log(`\n⚠️  Budget limit reached! Stopping collection.`);
        break;
      }

      // Delay between parks to respect API limits
      if (parkIdx < parksToProcess.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next park...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${park.name}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ COLLECTION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n💰 Final cost: $${totalCostSoFar.toFixed(2)} / $${MAX_BUDGET}`);
  console.log(`\n📍 Next steps:`);
  console.log(`   1. Check database: npm run db:studio`);
  console.log(`   2. Review data files in data/ directory`);
  console.log(`   3. Test your app with the new trails!\n`);

  await prisma.$disconnect();
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(current: number, total: number, width: number = 30): string {
  const percent = Math.min(100, Math.floor((current / total) * 100));
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentStr = `${percent}%`.padStart(4);

  return `[${bar}] ${percentStr}`;
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
