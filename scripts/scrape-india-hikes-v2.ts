/**
 * Scrape India Hikes Data v2
 * Improved scraper based on actual HTML structure
 *
 * Run: npx tsx scripts/scrape-india-hikes-v2.ts
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface IndiaTrail {
  name: string;
  state: string;
  region: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  difficulty?: string;
  description?: string;
  url: string;
  altitude?: number;
  duration?: string;
}

async function scrapeIndiaHikes() {
  console.log('\n🏔️ SCRAPING INDIA HIKES DATA (v2)\n');
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

  // Save to JSON
  const outputDir = 'data/raw';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `india-hikes-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(allTrails, null, 2));

  console.log(`💾 Saved raw data: ${outputPath}\n`);

  // Show sample
  console.log('📋 Sample Trails:\n');
  allTrails.slice(0, 15).forEach((trail, idx) => {
    console.log(`${idx + 1}. ${trail.name}`);
    console.log(`   State: ${trail.state}`);
    if (trail.difficulty) console.log(`   Difficulty: ${trail.difficulty}`);
    if (trail.distanceMiles) console.log(`   Distance: ${trail.distanceMiles.toFixed(1)} mi`);
    if (trail.elevationGainFt) console.log(`   Elevation: ${trail.elevationGainFt} ft`);
    console.log(`   URL: ${trail.url}`);
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

  // Find all trek links - format is like: "EasyNeergarh Waterfalls TrekView Trek"
  $('a[href*="/documented-trek/"]').each((_, elem) => {
    try {
      const $link = $(elem);
      const href = $link.attr('href') || '';
      const fullText = $link.text().trim();

      // Skip if empty
      if (!fullText || fullText.length < 5) return;

      // Parse the text format: "{Difficulty}{Trek Name}View Trek" or similar
      // Remove "View Trek" suffix
      let cleanText = fullText.replace(/View\s*Trek/gi, '').trim();

      // Extract difficulty from start
      const difficultyMatch = cleanText.match(/^(Easy|Moderate|Difficult|Hard)/i);
      let difficulty: string | undefined;

      if (difficultyMatch) {
        difficulty = difficultyMatch[1];
        cleanText = cleanText.replace(difficultyMatch[0], '').trim();

        // Normalize difficulty
        if (difficulty.toLowerCase() === 'easy') difficulty = 'Easy';
        else if (difficulty.toLowerCase() === 'moderate') difficulty = 'Moderate';
        else if (difficulty.toLowerCase() === 'difficult' || difficulty.toLowerCase() === 'hard')
          difficulty = 'Hard';
      }

      // The remaining text is the trek name
      let name = cleanText.trim();

      // If name ends with "Trek", keep it; otherwise add it
      if (!name.toLowerCase().endsWith('trek')) {
        name = name + ' Trek';
      }

      // Skip if name is too short
      if (name.length < 5) return;

      const trailUrl = href.startsWith('http') ? href : `https://indiahikes.com${href}`;

      trails.push({
        name,
        state: stateName,
        region: 'Himalayas',
        difficulty,
        url: trailUrl,
        description: `${name} in ${stateName}, India - Part of the ${stateName === 'Uttarakhand' ? 'Garhwal' : 'Himachal'} Himalayas`,
      });
    } catch (error) {
      console.error('Error parsing trek link:', error);
    }
  });

  // Remove duplicates by name
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
