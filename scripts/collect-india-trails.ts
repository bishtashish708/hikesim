/**
 * Indian Himalayan Trail Collection Script
 * Collects trails from Uttarakhand & Himachal Pradesh using OpenStreetMap
 */

import { ImprovedCollectionAgent, CollectionProgress } from '../src/agents/collector/improved-collector';
import { ImprovedValidationAgent, ValidationProgress } from '../src/agents/validator/improved-validator';
import { prisma } from '../src/lib/db';

// Indian Himalayan Regions with bounding boxes
const INDIAN_REGIONS = [
  // === UTTARAKHAND ===
  {
    name: 'Valley of Flowers & Nanda Devi',
    state: 'Uttarakhand',
    bbox: [30.5, 79.3, 30.9, 79.8],
    priority: 'high',
  },
  {
    name: 'Kedarnath & Badrinath',
    state: 'Uttarakhand',
    bbox: [30.3, 79.0, 30.8, 79.6],
    priority: 'high',
  },
  {
    name: 'Garhwal Himalayas',
    state: 'Uttarakhand',
    bbox: [29.5, 78.5, 31.2, 80.0],
    priority: 'medium',
  },
  {
    name: 'Kumaon Himalayas',
    state: 'Uttarakhand',
    bbox: [29.0, 79.5, 30.5, 80.5],
    priority: 'medium',
  },
  {
    name: 'Rishikesh & Haridwar',
    state: 'Uttarakhand',
    bbox: [29.8, 78.0, 30.2, 78.5],
    priority: 'low',
  },

  // === HIMACHAL PRADESH ===
  {
    name: 'Kullu-Manali',
    state: 'Himachal Pradesh',
    bbox: [31.8, 76.8, 32.4, 77.5],
    priority: 'high',
  },
  {
    name: 'Dharamshala & Kangra',
    state: 'Himachal Pradesh',
    bbox: [31.8, 76.0, 32.5, 76.8],
    priority: 'high',
  },
  {
    name: 'Spiti Valley',
    state: 'Himachal Pradesh',
    bbox: [31.5, 77.5, 32.5, 78.5],
    priority: 'medium',
  },
  {
    name: 'Lahaul Valley',
    state: 'Himachal Pradesh',
    bbox: [32.0, 76.5, 33.0, 77.5],
    priority: 'medium',
  },
  {
    name: 'Shimla & Surrounds',
    state: 'Himachal Pradesh',
    bbox: [30.8, 77.0, 31.3, 77.5],
    priority: 'low',
  },
];

const MAX_BUDGET = 40;
let totalCost = 0;

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const regionFilter = args.find(arg => arg.startsWith('--region='))?.split('=')[1];
  const priorityFilter = args.find(arg => arg.startsWith('--priority='))?.split('=')[1] as
    | 'high'
    | 'medium'
    | 'low'
    | undefined;

  console.log('\\n🇮🇳  Indian Himalayan Trail Collection System');
  console.log(`Mode: ${isLive ? '🔴 LIVE (writes to DB)' : '🟡 DRY RUN (preview only)'}`);
  console.log(`Budget: \\$${MAX_BUDGET} max\\n`);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  const collector = new ImprovedCollectionAgent(apiKey);
  const validator = new ImprovedValidationAgent(apiKey);

  let regionsToProcess = INDIAN_REGIONS;
  if (regionFilter) {
    regionsToProcess = INDIAN_REGIONS.filter(r =>
      r.name.toLowerCase().includes(regionFilter.toLowerCase())
    );
  }
  if (priorityFilter) {
    regionsToProcess = regionsToProcess.filter(r => r.priority === priorityFilter);
  }

  console.log(`📍 Processing ${regionsToProcess.length} region(s):\n`);
  regionsToProcess.forEach((r, i) =>
    console.log(`   ${i + 1}. ${r.name} (${r.state}) - Priority: ${r.priority}`)
  );

  if (isLive) {
    console.log('\n⚠️  LIVE MODE: Will insert to database!');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  for (let regionIdx = 0; regionIdx < regionsToProcess.length; regionIdx++) {
    const region = regionsToProcess[regionIdx];

    console.log('\n' + '='.repeat(80));
    console.log(`🏔️  [${regionIdx + 1}/${regionsToProcess.length}] ${region.name.toUpperCase()}`);
    console.log(`    State: ${region.state}`);
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

      // Build OSM query for this region using bounding box
      const [minLat, minLon, maxLat, maxLon] = region.bbox;
      const osmQuery = `
[out:json][timeout:180];
(
  way["highway"~"path|footway|track"]["name"]["foot"!="no"](${minLat},${minLon},${maxLat},${maxLon});
  way["route"="hiking"]["name"](${minLat},${minLon},${maxLat},${maxLon});
  relation["route"="hiking"]["name"](${minLat},${minLon},${maxLat},${maxLon});
);
out body;
>;
out skel qt;
`;

      console.log(`  📍 Bounding box: [${minLat}, ${minLon}, ${maxLat}, ${maxLon}]`);
      console.log(`  🔍 Querying OpenStreetMap...`);

      const collectionResult = await collector.collectWithCustomQuery(
        osmQuery,
        region.name,
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
          process.stdout.write(
            `\r  ${bar} Validating: ${msg} ${progress.current}/${progress.total}     `
          );
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
          process.stdout.write(
            `\r  ${bar} Inserting... ${i + 1}/${validationResult.validTrails.length}     `
          );

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
                  stateCode: region.state === 'Uttarakhand' ? 'UT' : 'HP',
                  countryCode: 'IN',
                  latitude: trail.latitude,
                  longitude: trail.longitude,
                  coordinates: trail.coordinates as any,
                  profilePoints: trail.profilePoints as any,
                  surface: trail.surface,
                  sourceUrl: trail.sourceUrl,
                  region: region.name, // Himalayan region
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

      if (regionIdx < regionsToProcess.length - 1) {
        console.log('\n⏳ Waiting 2s before next region...');
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
  console.log(`   - Verify data: npx tsx scripts/verify-all-data.ts\n`);

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
