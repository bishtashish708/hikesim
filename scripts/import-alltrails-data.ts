/**
 * Import AllTrails CSV Data
 * - Adds new trails
 * - Updates existing trails with better data
 * - Preserves all AllTrails information
 *
 * Run: npx tsx scripts/import-alltrails-data.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface AllTrailsRow {
  trail_id: string;
  name: string;
  area_name: string;
  city_name: string;
  state_name: string;
  country_name: string;
  _geoloc: string; // "{'lat': 60.18852, 'lng': -149.63156}"
  popularity: string;
  length: string; // in meters
  elevation_gain: string; // in meters
  difficulty_rating: string; // 1-7
  route_type: string;
  visitor_usage: string; // 1-3
  avg_rating: string;
  num_reviews: string;
  features: string; // "['dogs-no', 'views']"
  activities: string; // "['hiking', 'camping']"
  units: string; // 'i' for imperial, 'm' for metric
}

// Our target National Parks
const TARGET_PARKS = [
  'Yosemite National Park',
  'Grand Canyon National Park',
  'Zion National Park',
  'Rocky Mountain National Park',
  'Acadia National Park',
  'Grand Teton National Park',
  'Olympic National Park',
  'Yellowstone National Park',
  'Glacier National Park',
  'Great Smoky Mountains National Park',
];

async function importAllTrailsData() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 IMPORTING ALLTRAILS DATA');
  console.log('='.repeat(80) + '\n');

  const csvPath = path.join(process.cwd(), 'alltrails-data.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');

  console.log(`📄 CSV loaded: ${lines.length - 1} trails\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    try {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.log(`⚠️  Skipping row ${i}: column mismatch`);
        skipped++;
        continue;
      }

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      // Only import trails from our target parks
      if (!TARGET_PARKS.includes(row.area_name)) {
        skipped++;
        continue;
      }

      // Parse the data
      const trailData = parseTrailData(row as AllTrailsRow);

      // Check if trail already exists (by name and park)
      const existing = await prisma.hike.findFirst({
        where: {
          name: trailData.name,
          parkName: trailData.parkName,
        },
      });

      if (existing) {
        // Update existing trail with AllTrails data
        await prisma.hike.update({
          where: { id: existing.id },
          data: trailData,
        });

        updated++;
        if (updated % 10 === 0) {
          console.log(`   Updated ${updated} trails...`);
        }
      } else {
        // Insert new trail
        await prisma.hike.create({
          data: trailData,
        });

        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   Inserted ${inserted} new trails...`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing row ${i}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   New trails inserted: ${inserted}`);
  console.log(`   Existing trails updated: ${updated}`);
  console.log(`   Trails skipped (non-target parks): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total processed: ${inserted + updated}\n`);

  // Show breakdown by park
  const byPark = await prisma.hike.groupBy({
    by: ['parkName'],
    where: {
      parkName: { in: TARGET_PARKS },
      isSeed: false,
    },
    _count: true,
    orderBy: { _count: { parkName: 'desc' } },
  });

  console.log('📍 Trails by Park:\n');
  byPark.forEach((park) => {
    console.log(`   ${park.parkName}: ${park._count} trails`);
  });

  const total = byPark.reduce((sum, p) => sum + p._count, 0);
  console.log(`\n   TOTAL: ${total} quality trails\n`);

  await prisma.$disconnect();
}

/**
 * Parse CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse trail data from CSV row to database format
 */
function parseTrailData(row: AllTrailsRow): any {
  // Parse geolocation
  let lat: number | null = null;
  let lon: number | null = null;

  try {
    const geoMatch = row._geoloc.match(/lat':\s*([-\d.]+).*lng':\s*([-\d.]+)/);
    if (geoMatch) {
      lat = parseFloat(geoMatch[1]);
      lon = parseFloat(geoMatch[2]);
    }
  } catch (e) {
    console.log(`   Warning: Could not parse geolocation for ${row.name}`);
  }

  // Convert meters to miles and feet
  const lengthMeters = parseFloat(row.length);
  const elevationMeters = parseFloat(row.elevation_gain);

  const distanceMiles = lengthMeters / 1609.34;
  const elevationGainFt = Math.round(elevationMeters * 3.28084);

  // Parse difficulty (1-7 scale to our Easy/Moderate/Hard/Very Hard)
  const difficultyRating = parseInt(row.difficulty_rating);
  let difficulty: string;
  if (difficultyRating <= 2) {
    difficulty = 'Easy';
  } else if (difficultyRating <= 4) {
    difficulty = 'Moderate';
  } else if (difficultyRating <= 5) {
    difficulty = 'Hard';
  } else {
    difficulty = 'Very Hard';
  }

  // Parse features and activities
  let features: string[] = [];
  let activities: string[] = [];

  try {
    features = JSON.parse(row.features.replace(/'/g, '"'));
  } catch (e) {
    // Keep empty array
  }

  try {
    activities = JSON.parse(row.activities.replace(/'/g, '"'));
  } catch (e) {
    // Keep empty array
  }

  // Capitalize route type
  const routeType = row.route_type
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    // Core fields
    name: row.name,
    distanceMiles: distanceMiles,
    elevationGainFt: elevationGainFt,
    profilePoints: [], // Empty for now, can be populated later
    countryCode: 'US',
    stateCode: getStateCode(row.state_name),
    isSeed: false,

    // Location fields
    latitude: lat,
    longitude: lon,
    city: row.city_name,
    parkName: row.area_name,

    // Trail info
    difficulty: difficulty,
    trailType: routeType,
    description: `${row.name} in ${row.area_name}`,

    // AllTrails specific
    allTrailsId: row.trail_id,
    areaName: row.area_name,
    popularity: parseFloat(row.popularity),
    difficultyRating: difficultyRating,
    routeType: routeType,
    visitorUsage: parseInt(row.visitor_usage) || null,
    avgRating: parseFloat(row.avg_rating) || null,
    numReviews: parseInt(row.num_reviews) || 0,
    features: features,
    activities: activities,
    units: row.units,

    // Metadata
    lastEnriched: new Date(),
    sourceUrl: `https://www.alltrails.com`,
  };
}

/**
 * Get state code from state name
 */
function getStateCode(stateName: string): string {
  const states: Record<string, string> = {
    Alaska: 'AK',
    Arizona: 'AZ',
    California: 'CA',
    Colorado: 'CO',
    Maine: 'ME',
    Montana: 'MT',
    'North Carolina': 'NC',
    Tennessee: 'TN',
    Utah: 'UT',
    Washington: 'WA',
    Wyoming: 'WY',
  };

  return states[stateName] || stateName.substring(0, 2).toUpperCase();
}

// Run import
importAllTrailsData().catch((error) => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
