/**
 * Scrape India Hikes Data
 * Sources:
 * - https://indiahikes.com/state/Uttarakhand
 * - https://indiahikes.com/state/Himachal-Pradesh
 *
 * Run: npx tsx scripts/scrape-india-hikes.ts
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';
import { prisma } from '../src/lib/db';

interface IndiaTrail {
  name: string;
  state: string;
  region: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  difficulty?: string;
  description?: string;
  url: string;
  altitude?: number; // in feet
  duration?: string;
  bestSeason?: string;
}

async function scrapeIndiaHikes() {
  console.log('\n🏔️ SCRAPING INDIA HIKES DATA\n');
  console.log('='.repeat(80) + '\n');

  const states = [
    { name: 'Uttarakhand', url: 'https://indiahikes.com/state/Uttarakhand' },
    { name: 'Himachal Pradesh', url: 'https://indiahikes.com/state/Himachal-Pradesh' },
  ];

  const allTrails: IndiaTrail[] = [];

  for (const state of states) {
    console.log(`📡 Scraping ${state.name}...`);
    console.log(`   URL: ${state.url}\n`);

    try {
      const trails = await scrapeStatePage(state.url, state.name);
      allTrails.push(...trails);
      console.log(`   ✓ Found ${trails.length} trails\n`);

      // Delay to be respectful
      await delay(2000);
    } catch (error) {
      console.error(`   ❌ Error scraping ${state.name}:`, error);
    }
  }

  console.log(`\n📊 Total trails scraped: ${allTrails.length}\n`);

  // Save to JSON for review
  const fs = require('fs');
  const path = require('path');
  const outputDir = 'data/raw';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `india-hikes-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(allTrails, null, 2));

  console.log(`💾 Saved raw data: ${outputPath}\n`);

  // Show sample
  console.log('📋 Sample Trails:\n');
  allTrails.slice(0, 10).forEach((trail, idx) => {
    console.log(`${idx + 1}. ${trail.name}`);
    console.log(`   State: ${trail.state}`);
    console.log(`   Region: ${trail.region}`);
    if (trail.distanceMiles) console.log(`   Distance: ${trail.distanceMiles} mi`);
    if (trail.elevationGainFt) console.log(`   Elevation: ${trail.elevationGainFt} ft`);
    if (trail.difficulty) console.log(`   Difficulty: ${trail.difficulty}`);
    console.log('');
  });

  return allTrails;
}

async function scrapeStatePage(url: string, stateName: string): Promise<IndiaTrail[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const trails: IndiaTrail[] = [];

  // India Hikes uses cards for trek listings
  // Look for trek cards/links
  $('.trek-card, .trekCard, article, .trek-item').each((_, elem) => {
    try {
      const $card = $(elem);

      // Extract trail name
      const nameElem = $card.find('h2, h3, .trek-name, .title, a[href*="/treks/"]').first();
      const name = nameElem.text().trim();

      if (!name || name.length < 3) return;

      // Extract URL
      const linkElem = $card.find('a[href*="/treks/"]').first();
      const relativeUrl = linkElem.attr('href');
      const trailUrl = relativeUrl?.startsWith('http')
        ? relativeUrl
        : `https://indiahikes.com${relativeUrl}`;

      // Extract other data from card
      const cardText = $card.text();

      // Try to extract distance (km or miles)
      const distanceMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers)/i);
      const distanceMiles = distanceMatch
        ? parseFloat(distanceMatch[1]) * 0.621371
        : undefined;

      // Try to extract altitude/elevation
      const altitudeMatch = cardText.match(/(\d{1,2},?\d{3})\s*(?:ft|feet|meters?|m\b)/i);
      let altitude: number | undefined;
      let elevationGainFt: number | undefined;

      if (altitudeMatch) {
        const value = parseInt(altitudeMatch[1].replace(/,/g, ''));
        const unit = altitudeMatch[0].toLowerCase();

        if (unit.includes('ft') || unit.includes('feet')) {
          altitude = value;
        } else {
          altitude = Math.round(value * 3.28084);
        }

        // Estimate elevation gain (rough approximation)
        if (altitude > 10000) {
          elevationGainFt = altitude - 5000; // Rough estimate
        }
      }

      // Extract difficulty
      const difficultyMatch = cardText.match(/\b(easy|moderate|difficult|hard|challenging)\b/i);
      let difficulty = difficultyMatch ? difficultyMatch[1] : undefined;

      if (difficulty) {
        // Normalize difficulty
        const lower = difficulty.toLowerCase();
        if (lower === 'easy') difficulty = 'Easy';
        else if (lower === 'moderate') difficulty = 'Moderate';
        else if (lower === 'hard' || lower === 'difficult' || lower === 'challenging')
          difficulty = 'Hard';
      }

      // Extract duration
      const durationMatch = cardText.match(/(\d+)\s*(?:days?|nights?)/i);
      const duration = durationMatch ? durationMatch[0] : undefined;

      // Determine region (Himalayas for both states)
      const region = 'Himalayas';

      trails.push({
        name,
        state: stateName,
        region,
        distanceMiles,
        elevationGainFt,
        difficulty,
        url: trailUrl || url,
        altitude,
        duration,
        description: `${name} in ${stateName}, India`,
      });
    } catch (error) {
      console.error('Error parsing trek card:', error);
    }
  });

  // Also try to find links in a simple list format
  if (trails.length === 0) {
    $('a[href*="/treks/"]').each((_, elem) => {
      const $link = $(elem);
      const name = $link.text().trim();

      if (!name || name.length < 3 || name.toLowerCase().includes('view')) return;

      const relativeUrl = $link.attr('href');
      const trailUrl = relativeUrl?.startsWith('http')
        ? relativeUrl
        : `https://indiahikes.com${relativeUrl}`;

      trails.push({
        name,
        state: stateName,
        region: 'Himalayas',
        url: trailUrl || url,
        description: `${name} in ${stateName}, India`,
      });
    });
  }

  // Remove duplicates
  const unique = trails.filter(
    (trail, index, self) => index === self.findIndex((t) => t.name === trail.name)
  );

  return unique;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run scraper
scrapeIndiaHikes().catch((error) => {
  console.error('\n❌ Scraping failed:', error);
  process.exit(1);
});
