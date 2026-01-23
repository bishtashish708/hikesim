/**
 * Fetch trails from OpenStreetMap and save to database
 * Usage: npm run trails:fetch-osm -- --region CA --limit 20
 */

import { fetchAndEnrichTrails, saveTrailsToDatabase, type TrailRegion } from '../src/lib/trail-data/trail-enricher';

// US State codes to names
const US_REGIONS: Record<string, string> = {
  CA: 'California',
  CO: 'Colorado',
  WA: 'Washington',
  UT: 'Utah',
  AZ: 'Arizona',
  WY: 'Wyoming',
  MT: 'Montana',
  OR: 'Oregon',
  NM: 'New Mexico',
  AK: 'Alaska',
};

// India state codes
const INDIA_REGIONS: Record<string, string> = {
  HP: 'Himachal Pradesh',
  UT: 'Uttarakhand',
  JK: 'Jammu and Kashmir',
  SK: 'Sikkim',
  MH: 'Maharashtra',
};

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let regionCode: string | null = null;
  let limit = 50;
  let country: 'US' | 'IN' = 'US';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--region' && args[i + 1]) {
      regionCode = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--country' && args[i + 1]) {
      country = args[i + 1] as 'US' | 'IN';
      i++;
    }
  }

  if (!regionCode) {
    console.error('Usage: npm run trails:fetch-osm -- --region <CODE> [--limit <N>] [--country US|IN]');
    console.error('\nAvailable US regions:', Object.keys(US_REGIONS).join(', '));
    console.error('Available India regions:', Object.keys(INDIA_REGIONS).join(', '));
    process.exit(1);
  }

  const regions = country === 'US' ? US_REGIONS : INDIA_REGIONS;
  const regionName = regions[regionCode];

  if (!regionName) {
    console.error(`Unknown region code: ${regionCode}`);
    console.error('Available regions:', Object.keys(regions).join(', '));
    process.exit(1);
  }

  console.log(`\n🏔️  Fetching ${limit} trails from ${regionName} (${country}-${regionCode})\n`);

  const region: TrailRegion = {
    country,
    state: regionCode,
  };

  try {
    // Fetch and enrich trails
    const trails = await fetchAndEnrichTrails(region, limit);

    console.log(`\n✓ Enriched ${trails.length} trails`);
    console.log('\nSaving to database...\n');

    // Save to database
    const savedCount = await saveTrailsToDatabase(trails);

    console.log(`\n✅ Successfully saved ${savedCount} trails to database!`);
    console.log(`\nRegion: ${regionName} (${country}-${regionCode})`);
    console.log(`Total trails: ${savedCount}`);

    if (savedCount > 0) {
      console.log('\nSample trails:');
      trails.slice(0, 5).forEach((trail, i) => {
        console.log(`  ${i + 1}. ${trail.name}`);
        console.log(`     ${trail.distanceMiles.toFixed(1)} mi, ${trail.elevationGainFt} ft, ${trail.difficulty}`);
      });
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
