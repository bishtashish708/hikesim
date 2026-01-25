/**
 * Scrape Yosemite trails list
 */

import * as cheerio from 'cheerio';

async function scrapeYosemiteTrails() {
  const url = 'https://www.nps.gov/yose/planyourvisit/trails.htm';

  console.log(`Scraping ${url}...\n`);

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== TABLES ===\n');
  $('table').each((idx, table) => {
    console.log(`\nTable ${idx + 1}:`);
    console.log('-'.repeat(80));

    $(table).find('tr').slice(0, 15).each((rowIdx, row) => {
      const cells = $(row).find('th, td').map((_, cell) => {
        return $(cell).text().trim().replace(/\s+/g, ' ');
      }).get();

      if (cells.length > 0) {
        console.log(`Row ${rowIdx + 1}: ${cells.join(' | ')}`);
      }
    });
  });

  console.log('\n\n=== PARAGRAPHS with trail info ===\n');
  $('p').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.includes('miles') || text.includes('elevation')) {
      console.log(`- ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`);
    }
  });
}

scrapeYosemiteTrails().catch(console.error);
