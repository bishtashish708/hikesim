/**
 * Import ALL Parks from AllTrails CSV
 * (Not just the 10 target parks)
 *
 * Run: npx tsx scripts/import-all-parks.ts
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
  _geoloc: string;
  popularity: string;
  length: string;
  elevation_gain: string;
  difficulty_rating: string;
  route_type: string;
  visitor_usage: string;
  avg_rating: string;
  num_reviews: string;
  features: string;
  activities: string;
  units: string;
}

async function importAllParks() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 IMPORTING ALL PARKS FROM ALLTRAILS');
  console.log('='.repeat(80) + '\n');

  const csvPath = path.join(process.cwd(), 'alltrails-data.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');

  console.log(`📄 CSV loaded: ${lines.length - 1} total trails\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    try {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        skipped++;
        continue;
      }

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      // Skip non-US trails
      if (row.country_name !== 'United States') {
        skipped++;
        continue;
      }

      // Parse trail data
      const trailData = parseTrailData(row as AllTrailsRow);

      // Check if trail exists
      const existing = await prisma.hike.findFirst({
        where: {
          name: trailData.name,
          parkName: trailData.parkName,
        },
      });

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

      if ((inserted + updated) % 50 === 0) {
        console.log(`   Processed ${inserted + updated} trails...`);
      }
    } catch (error) {
      console.error(`❌ Error on row ${i}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   New trails: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}\n`);

  // Show park breakdown
  const parks = await prisma.hike.groupBy({
    by: ['parkName'],
    where: { isSeed: false },
    _count: true,
    orderBy: { _count: { parkName: 'desc' } },
  });

  console.log(`📍 All Parks (${parks.length} total):\n`);
  parks.slice(0, 30).forEach((park) => {
    console.log(`   ${park.parkName}: ${park._count} trails`);
  });

  if (parks.length > 30) {
    console.log(`   ... and ${parks.length - 30} more parks`);
  }

  const total = parks.reduce((sum, p) => sum + p._count, 0);
  console.log(`\n   TOTAL: ${total} trails\n`);

  await prisma.$disconnect();
}

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

function parseTrailData(row: AllTrailsRow): any {
  let lat: number | null = null;
  let lon: number | null = null;

  try {
    const geoMatch = row._geoloc.match(/lat':\s*([-\d.]+).*lng':\s*([-\d.]+)/);
    if (geoMatch) {
      lat = parseFloat(geoMatch[1]);
      lon = parseFloat(geoMatch[2]);
    }
  } catch (e) {
    // Skip geolocation parsing error
  }

  const lengthMeters = parseFloat(row.length);
  const elevationMeters = parseFloat(row.elevation_gain);
  const distanceMiles = lengthMeters / 1609.34;
  const elevationGainFt = Math.round(elevationMeters * 3.28084);

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

  let features: string[] = [];
  let activities: string[] = [];

  try {
    features = JSON.parse(row.features.replace(/'/g, '"'));
  } catch (e) {}

  try {
    activities = JSON.parse(row.activities.replace(/'/g, '"'));
  } catch (e) {}

  const routeType = row.route_type
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Generate elevation profile points with trail name and difficulty for realistic variation
  const profilePoints = generateProfilePoints(distanceMiles, elevationGainFt, routeType, row.name, difficulty);

  return {
    name: row.name,
    distanceMiles: distanceMiles,
    elevationGainFt: elevationGainFt,
    profilePoints: profilePoints,
    countryCode: 'US',
    stateCode: getStateCode(row.state_name),
    isSeed: false,
    latitude: lat,
    longitude: lon,
    city: row.city_name,
    parkName: row.area_name,
    difficulty: difficulty,
    trailType: routeType,
    description: `${row.name} in ${row.area_name}`,
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
    lastEnriched: new Date(),
    sourceUrl: `https://www.alltrails.com`,
  };
}

/**
 * Generate elevation profile points from distance and elevation gain
 * This creates a realistic trail profile based on the route type
 */
function generateProfilePoints(
  distanceMiles: number,
  elevationGainFt: number,
  routeType: string,
  trailName: string = '',
  difficulty: string = 'Moderate'
): Array<{ distanceMiles: number; elevationFt: number }> {
  const numPoints = Math.min(100, Math.max(20, Math.floor(distanceMiles * 5)));
  const points: Array<{ distanceMiles: number; elevationFt: number }> = [];
  const startElevation = 4000 + Math.random() * 3000; // Vary base elevation: 4000-7000 ft

  // Determine profile pattern based on trail characteristics
  const profileType = determineProfileType(trailName, difficulty, elevationGainFt, routeType);

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const distance = distanceMiles * progress;

    let elevationFactor: number;

    switch (profileType) {
      case 'steep-start':
        // Steep initial climb, then gradual
        elevationFactor = progress < 0.3
          ? Math.pow(progress / 0.3, 0.6)
          : 1 - Math.pow(1 - progress, 3) * 0.3;
        break;

      case 'gradual-climb':
        // Steady gradual climb to summit
        elevationFactor = Math.pow(progress, 1.5);
        break;

      case 'multi-peak':
        // Multiple ups and downs (2-3 peaks)
        const peaks = 2 + Math.floor(Math.random() * 2);
        elevationFactor = 0;
        for (let p = 0; p < peaks; p++) {
          const peakProgress = (p + 1) / (peaks + 1);
          const dist = Math.abs(progress - peakProgress);
          elevationFactor += Math.exp(-dist * dist * 20) / peaks;
        }
        elevationFactor = Math.min(1, elevationFactor * 1.2);
        break;

      case 'ridge-walk':
        // Climb to ridge, walk along ridge, then descend
        if (progress < 0.25) {
          elevationFactor = Math.pow(progress / 0.25, 0.8);
        } else if (progress < 0.75) {
          elevationFactor = 0.9 + Math.sin((progress - 0.25) * 8) * 0.1;
        } else {
          elevationFactor = 1 - Math.pow((progress - 0.75) / 0.25, 1.5);
        }
        break;

      case 'summit-push':
        // Moderate climb with steep summit push at end
        elevationFactor = progress < 0.7
          ? Math.pow(progress / 0.7, 2) * 0.6
          : 0.6 + Math.pow((progress - 0.7) / 0.3, 0.5) * 0.4;
        break;

      case 'loop':
        // Loop: climb, plateau, descend with variation
        if (progress < 0.4) {
          elevationFactor = Math.pow(progress / 0.4, 1.2);
        } else if (progress < 0.7) {
          elevationFactor = 0.9 + Math.sin((progress - 0.4) * 12) * 0.1;
        } else {
          elevationFactor = Math.pow((1 - progress) / 0.3, 1.3);
        }
        break;

      default: // 'out-and-back'
        // Classic out-and-back: climb to midpoint, return with variation
        elevationFactor = progress <= 0.5
          ? Math.pow(progress * 2, 1.2) * 0.5 + Math.sin(progress * Math.PI * 4) * 0.05
          : Math.pow((1 - progress) * 2, 1.2) * 0.5 + Math.sin(progress * Math.PI * 4) * 0.05;
    }

    // Add natural variation (small bumps and dips)
    const noise = Math.sin(progress * Math.PI * 8 + Math.random() * 2) * 0.03;
    elevationFactor = Math.max(0, Math.min(1, elevationFactor + noise));

    const elevation = startElevation + elevationGainFt * elevationFactor;
    points.push({ distanceMiles: distance, elevationFt: Math.round(elevation) });
  }

  return points;
}

function determineProfileType(
  trailName: string,
  difficulty: string,
  elevationGainFt: number,
  routeType: string
): string {
  const name = trailName.toLowerCase();

  // Check route type first
  if (routeType.toLowerCase().includes('loop')) return 'loop';

  // Analyze trail name for clues
  if (name.includes('ridge') || name.includes('pass') || name.includes('col')) return 'ridge-walk';
  if (name.includes('peak') || name.includes('summit') || name.includes('dome') || name.includes('mountain')) return 'summit-push';
  if (name.includes('lake') || name.includes('glacier') || name.includes('falls')) return 'gradual-climb';
  if (name.includes('canyon') || name.includes('valley')) {
    return elevationGainFt > 3000 ? 'steep-start' : 'gradual-climb';
  }

  // Use difficulty and elevation gain as fallback
  if (difficulty === 'Hard' && elevationGainFt > 4000) return 'steep-start';
  if (difficulty === 'Easy' || elevationGainFt < 1000) return 'gradual-climb';
  if (routeType.toLowerCase().includes('point')) return 'gradual-climb';

  // Random selection for variety
  const types = ['out-and-back', 'gradual-climb', 'multi-peak', 'ridge-walk'];
  return types[Math.floor(Math.random() * types.length)];
}

function getStateCode(stateName: string): string {
  const states: Record<string, string> = {
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Colorado: 'CO',
    Florida: 'FL',
    Hawaii: 'HI',
    Idaho: 'ID',
    Kentucky: 'KY',
    Maine: 'ME',
    Michigan: 'MI',
    Minnesota: 'MN',
    Montana: 'MT',
    Nevada: 'NV',
    'New Mexico': 'NM',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oregon: 'OR',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wyoming: 'WY',
  };

  return states[stateName] || stateName.substring(0, 2).toUpperCase();
}

importAllParks().catch((error) => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
