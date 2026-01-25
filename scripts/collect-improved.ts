/**
 * Improved trail collection with progress bars
 */

import { ImprovedCollectionAgent, CollectionProgress } from '../src/agents/collector/improved-collector';
import { ImprovedValidationAgent, ValidationProgress } from '../src/agents/validator/improved-validator';
import { prisma } from '../src/lib/db';

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

const MAX_BUDGET = 40;
let totalCost = 0;

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const parkFilter = args.find(arg => arg.startsWith('--park='))?.split('=')[1];

  console.log('\n🏔️  Improved Trail Collection System');
  console.log(`Mode: ${isLive ? '🔴 LIVE (writes to DB)' : '🟡 DRY RUN (preview only)'}`);
  console.log(`Budget: $${MAX_BUDGET} max\n`);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  const collector = new ImprovedCollectionAgent(apiKey);
  const validator = new ImprovedValidationAgent(apiKey);

  let parksToProcess = PARKS;
  if (parkFilter) {
    parksToProcess = PARKS.filter(
      p => p.code === parkFilter || p.name.toLowerCase().includes(parkFilter.toLowerCase())
    );
  }

  console.log(`📍 Processing ${parksToProcess.length} park(s):\n`);
  parksToProcess.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.code})`));

  if (isLive) {
    console.log('\n⚠️  LIVE MODE: Will insert to database!');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  for (let parkIdx = 0; parkIdx < parksToProcess.length; parkIdx++) {
    const park = parksToProcess[parkIdx];

    console.log('\n' + '='.repeat(80));
    console.log(`🏞️  [${parkIdx + 1}/${parksToProcess.length}] ${park.name.toUpperCase()}`);
    console.log('='.repeat(80));

    try {
      // === PHASE 1: COLLECTION ===
      console.log('\n📥 PHASE 1: DATA COLLECTION');
      console.log('─'.repeat(80));

      const collectionProgress = (progress: CollectionProgress) => {
        if (progress.phase === 'fetch') {
          console.log(`  ${progress.message}`);
        } else if (progress.phase === 'parse') {
          const bar = createBar(progress.current, progress.total);
          process.stdout.write(`\r  ${bar} ${progress.message}     `);
          if (progress.current === progress.total) console.log();
        } else if (progress.phase === 'complete') {
          console.log(`\n✅ ${progress.message}`);
        }
      };

      const collectionResult = await collector.collectTrailsForPark(
        park.name,
        park.code,
        collectionProgress
      );

      console.log(`\n📊 Found ${collectionResult.trailsFound} trails`);

      if (collectionResult.trailsFound === 0) {
        console.log('⚠️  No trails found, skipping.');
        continue;
      }

      // === PHASE 2: VALIDATION ===
      console.log('\n✅ PHASE 2: AI VALIDATION');
      console.log('─'.repeat(80));

      const validationProgress = (progress: ValidationProgress) => {
        if (progress.phase === 'dedup') {
          console.log(`  ${progress.message}`);
        } else if (progress.phase === 'validate') {
          const bar = createBar(progress.current, progress.total);
          const msg = progress.message?.padEnd(40).substring(0, 40);
          process.stdout.write(`\r  ${bar} Validating: ${msg} ${progress.current}/${progress.total}     `);
          if (progress.current === progress.total) console.log();
        } else if (progress.phase === 'complete') {
          console.log(`\n✅ ${progress.message}`);
        }
      };

      const validationResult = await validator.validateTrails(
        collectionResult.trails,
        validationProgress
      );

      console.log(`\n📊 Validation Results:`);
      console.log(`   - Valid: ${validationResult.summary.passed}`);
      console.log(`   - Invalid: ${validationResult.summary.failed}`);
      console.log(`   - Duplicates: ${validationResult.summary.duplicates}`);
      console.log(`   - Avg quality: ${validationResult.summary.averageQualityScore.toFixed(1)}/100`);

      // === PHASE 3: DATABASE INSERTION ===
      if (isLive && validationResult.validTrails.length > 0) {
        console.log('\n💾 PHASE 3: DATABASE INSERTION');
        console.log('─'.repeat(80));

        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < validationResult.validTrails.length; i++) {
          const trail = validationResult.validTrails[i];

          const bar = createBar(i + 1, validationResult.validTrails.length);
          process.stdout.write(`\r  ${bar} Inserting... ${i + 1}/${validationResult.validTrails.length}     `);

          try {
            const existing = await prisma.hike.findFirst({
              where: { name: trail.name, parkName: trail.parkName },
            });

            if (existing) {
              skipped++;
            } else {
              await prisma.hike.create({
                data: {
                  name: trail.name,
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
            console.error(`\n    ✗ Failed to insert ${trail.name}`);
          }
        }

        console.log(`\n\n✅ Inserted ${inserted} trails, skipped ${skipped} duplicates`);
      }

      console.log(`\n💰 Budget: $${totalCost.toFixed(2)} / $${MAX_BUDGET}`);

      if (totalCost >= MAX_BUDGET) {
        console.log('\n⚠️  Budget limit reached!');
        break;
      }

      if (parkIdx < parksToProcess.length - 1) {
        console.log('\n⏳ Waiting 2s before next park...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error(`\n❌ Error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ COLLECTION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n💰 Final cost: $${totalCost.toFixed(2)}`);
  console.log(`\n📍 Next steps:`);
  console.log(`   - Check DB: npm run db:studio`);
  console.log(`   - Verify data: npm run collect:verify\n`);

  await prisma.$disconnect();
}

function createBar(current: number, total: number, width: number = 30): string {
  const percent = Math.min(100, Math.floor((current / total) * 100));
  const filled = Math.floor((percent / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${percent}%`;
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
