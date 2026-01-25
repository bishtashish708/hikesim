/**
 * Find Yosemite trail pages
 */

import * as cheerio from 'cheerio';

async function findTrails() {
  // Try the main hiking page
  const mainUrl = 'https://www.nps.gov/yose/planyourvisit/hiking.htm';

  console.log(`Checking ${mainUrl}...\n`);

  const response = await fetch(mainUrl);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== LINKS containing "trail" ===\n');
  $('a').each((_, link) => {
    const href = $(link).attr('href');
    const text = $(link).text().trim();

    if (!href) return;

    if (text.toLowerCase().includes('trail') ||
        text.toLowerCase().includes('hike') ||
        href.toLowerCase().includes('trail')) {
      const fullUrl = href.startsWith('http') ? href : `https://www.nps.gov${href}`;
      console.log(`${text}`);
      console.log(`  → ${fullUrl}\n`);
    }
  });

  // Try Yosemite Valley specific page
  console.log('\n=== Checking Yosemite Valley page ===\n');
  const valleyUrl = 'https://www.nps.gov/yose/planyourvisit/yosemitevalley.htm';
  const valleyResp = await fetch(valleyUrl);
  const valleyHtml = await valleyResp.text();
  const $2 = cheerio.load(valleyHtml);

  $2('a').each((_, link) => {
    const href = $2(link).attr('href');
    const text = $2(link).text().trim();

    if (!href) return;

    if (text.toLowerCase().includes('trail') ||
        text.toLowerCase().includes('hike') ||
        text.toLowerCase().includes('dome') ||
        text.toLowerCase().includes('falls')) {
      const fullUrl = href.startsWith('http') ? href : `https://www.nps.gov${href}`;
      console.log(`${text}`);
      console.log(`  → ${fullUrl}\n`);
    }
  });
}

findTrails().catch(console.error);
