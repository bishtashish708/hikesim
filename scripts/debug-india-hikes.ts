/**
 * Debug India Hikes HTML structure
 */

import * as cheerio from 'cheerio';

async function debug() {
  const url = 'https://indiahikes.com/state/Uttarakhand';

  console.log(`Fetching ${url}...\n`);

  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  console.log('=== PAGE TITLE ===');
  console.log($('title').text());
  console.log('');

  console.log('=== HEADINGS (h1, h2, h3) ===');
  $('h1, h2, h3').slice(0, 10).each((_, elem) => {
    console.log(`${$(elem).prop('tagName')}: ${$(elem).text().trim()}`);
  });
  console.log('');

  console.log('=== LINKS containing "trek" ===');
  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();

    if (href && (href.includes('trek') || text.toLowerCase().includes('trek'))) {
      console.log(`${text}`);
      console.log(`  → ${href}\n`);
    }
  });

  console.log('\n=== ARTICLE/CARD ELEMENTS ===');
  $('article, .card, [class*="trek"], [class*="card"]').slice(0, 5).each((idx, elem) => {
    console.log(`Element ${idx + 1}: ${$(elem).prop('tagName')} ${$(elem).attr('class')}`);
    console.log(`Text: ${$(elem).text().trim().substring(0, 200)}`);
    console.log('');
  });
}

debug().catch(console.error);
