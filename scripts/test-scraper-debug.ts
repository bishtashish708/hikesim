/**
 * Debug NPS scraper to see what HTML we're getting
 */

import * as cheerio from 'cheerio';

async function debug() {
  const url = 'https://www.nps.gov/yose/planyourvisit/hiking.htm';

  console.log(`Fetching ${url}...\n`);

  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  console.log('=== HEADINGS (h2, h3, h4) ===\n');
  $('h2, h3, h4').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text) {
      console.log(`${$(elem).prop('tagName')}: ${text}`);
    }
  });

  console.log('\n=== PARAGRAPHS mentioning "trail" ===\n');
  $('p').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.toLowerCase().includes('trail') && text.length < 300) {
      console.log(`- ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`);
    }
  });

  console.log('\n=== LISTS mentioning "trail" ===\n');
  $('li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.toLowerCase().includes('trail') && text.length < 300) {
      console.log(`- ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`);
    }
  });

  console.log('\n=== TABLES ===\n');
  $('table').each((idx, table) => {
    console.log(`Table ${idx + 1}:`);
    $(table).find('tr').slice(0, 3).each((_, row) => {
      const cells = $(row).find('th, td').map((_, cell) => $(cell).text().trim()).get();
      console.log(`  ${cells.join(' | ')}`);
    });
    console.log('');
  });
}

debug().catch(console.error);
