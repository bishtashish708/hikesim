/**
 * NPS Website Scraper
 * Scrapes trail information from official NPS park websites
 * Each park has different HTML structure, so this requires park-specific logic
 */

import * as cheerio from 'cheerio';
import type { RawTrailData } from '../types';

export class NPSScraper {
  /**
   * Scrape trail data from NPS park hiking pages
   * Note: This is a simplified version. Each park requires custom parsing.
   */
  async scrapeTrailsForPark(parkCode: string, parkName: string): Promise<RawTrailData[]> {
    const url = this.getHikingPageUrl(parkCode);

    if (!url) {
      console.log(`   ⚠️  No scraping URL configured for ${parkCode}`);
      return [];
    }

    console.log(`   🕷️  Scraping NPS website: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`   ❌ Failed to fetch ${url}: ${response.status}`);
        return [];
      }

      const html = await response.text();

      // Parse based on park-specific structure
      const trails = this.parseTrailsFromHTML(html, parkCode, parkName, url);

      console.log(`   ✓ Scraped ${trails.length} trails from website`);

      return trails;
    } catch (error) {
      console.error(`   ❌ Scraping error: ${error}`);
      return [];
    }
  }

  /**
   * Get the hiking/trails page URL for each park
   */
  private getHikingPageUrl(parkCode: string): string | null {
    const urls: Record<string, string> = {
      yose: 'https://www.nps.gov/yose/planyourvisit/hiking.htm',
      grca: 'https://www.nps.gov/grca/planyourvisit/day-hiking.htm',
      zion: 'https://www.nps.gov/zion/planyourvisit/hiking-in-zion.htm',
      romo: 'https://www.nps.gov/romo/planyourvisit/hiking.htm',
      acad: 'https://www.nps.gov/acad/planyourvisit/hiking.htm',
      grte: 'https://www.nps.gov/grte/planyourvisit/hike.htm',
      olym: 'https://www.nps.gov/olym/planyourvisit/wilderness-trip-planner.htm',
      yell: 'https://www.nps.gov/yell/planyourvisit/hiking.htm',
      glac: 'https://www.nps.gov/glac/planyourvisit/hiking.htm',
      grsm: 'https://www.nps.gov/grsm/planyourvisit/hiking.htm',
    };

    return urls[parkCode] || null;
  }

  /**
   * Parse trail information from HTML using Cheerio
   */
  private parseTrailsFromHTML(
    html: string,
    parkCode: string,
    parkName: string,
    sourceUrl: string
  ): RawTrailData[] {
    // Use park-specific parsers
    switch (parkCode) {
      case 'yose':
        return this.parseYosemite(html, parkName, sourceUrl);
      case 'grca':
        return this.parseGrandCanyon(html, parkName, sourceUrl);
      case 'zion':
        return this.parseZion(html, parkName, sourceUrl);
      case 'olym':
        return this.parseOlympic(html, parkName, sourceUrl);
      default:
        return this.parseGeneric(html, parkCode, parkName, sourceUrl);
    }
  }

  /**
   * Parse Yosemite trails from NPS hiking page
   */
  private parseYosemite(html: string, parkName: string, sourceUrl: string): RawTrailData[] {
    const $ = cheerio.load(html);
    const trails: RawTrailData[] = [];

    // Yosemite lists trails in paragraphs and tables
    // Look for trail names followed by distance/elevation info
    $('p, li, td').each((_, elem) => {
      const text = $(elem).text();

      // Look for trail name patterns
      if (!text.includes('Trail') && !text.includes('trail')) {
        return;
      }

      const trail = this.extractTrailFromText(text, 'yose', parkName, sourceUrl);
      if (trail && trail.name) {
        trails.push(trail);
      }
    });

    // Also check for structured trail tables
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const nameCell = $(cells[0]).text().trim();
        const infoCell = $(cells[1]).text().trim();

        if (nameCell.toLowerCase().includes('trail')) {
          const trail = this.extractTrailFromText(`${nameCell} ${infoCell}`, 'yose', parkName, sourceUrl);
          if (trail && trail.name) {
            trails.push(trail);
          }
        }
      }
    });

    // Remove duplicates by name
    const uniqueTrails = this.deduplicateTrails(trails);

    return uniqueTrails;
  }

  /**
   * Parse Grand Canyon trails
   */
  private parseGrandCanyon(html: string, parkName: string, sourceUrl: string): RawTrailData[] {
    const $ = cheerio.load(html);
    const trails: RawTrailData[] = [];

    // Grand Canyon has structured trail descriptions
    $('h3, h4').each((_, elem) => {
      const heading = $(elem).text();
      if (heading.toLowerCase().includes('trail')) {
        const nextP = $(elem).next('p').text();
        const trail = this.extractTrailFromText(`${heading} ${nextP}`, 'grca', parkName, sourceUrl);
        if (trail && trail.name) {
          trails.push(trail);
        }
      }
    });

    return this.deduplicateTrails(trails);
  }

  /**
   * Parse Zion trails
   */
  private parseZion(html: string, parkName: string, sourceUrl: string): RawTrailData[] {
    const $ = cheerio.load(html);
    const trails: RawTrailData[] = [];

    $('h3, h4, p').each((_, elem) => {
      const text = $(elem).text();
      if (text.toLowerCase().includes('trail') || text.toLowerCase().includes('narrows') || text.toLowerCase().includes('angels landing')) {
        const trail = this.extractTrailFromText(text, 'zion', parkName, sourceUrl);
        if (trail && trail.name) {
          trails.push(trail);
        }
      }
    });

    return this.deduplicateTrails(trails);
  }

  /**
   * Parse Olympic trails
   */
  private parseOlympic(html: string, parkName: string, sourceUrl: string): RawTrailData[] {
    const $ = cheerio.load(html);
    const trails: RawTrailData[] = [];

    $('p, li, h3, h4').each((_, elem) => {
      const text = $(elem).text();
      if (text.toLowerCase().includes('trail')) {
        const trail = this.extractTrailFromText(text, 'olym', parkName, sourceUrl);
        if (trail && trail.name) {
          trails.push(trail);
        }
      }
    });

    return this.deduplicateTrails(trails);
  }

  /**
   * Generic parser for other parks
   */
  private parseGeneric(html: string, parkCode: string, parkName: string, sourceUrl: string): RawTrailData[] {
    const $ = cheerio.load(html);
    const trails: RawTrailData[] = [];

    $('h3, h4, p, li').each((_, elem) => {
      const text = $(elem).text();
      if (text.toLowerCase().includes('trail')) {
        const trail = this.extractTrailFromText(text, parkCode, parkName, sourceUrl);
        if (trail && trail.name) {
          trails.push(trail);
        }
      }
    });

    return this.deduplicateTrails(trails);
  }

  /**
   * Extract trail data from text block
   */
  private extractTrailFromText(text: string, parkCode: string, parkName: string, sourceUrl: string): RawTrailData | null {
    const name = this.extractTrailName(text);
    if (!name) return null;

    const distance = this.extractDistance(text);
    const elevation = this.extractElevation(text);

    // Only return trails that have at least distance or elevation
    if (!distance && !elevation) {
      return null;
    }

    return {
      source: 'scrape',
      confidence: (distance && elevation) ? 70 : 50,
      name,
      parkName,
      parkCode,
      stateCode: this.getStateCode(parkCode),
      distanceMiles: distance,
      elevationGainFt: elevation,
      url: sourceUrl,
      metadata: {
        collectedAt: new Date(),
        collectorVersion: '1.0.0',
        sourceUrl,
      },
    };
  }

  /**
   * Extract trail name from text
   */
  private extractTrailName(text: string): string | null {
    // Look for trail names before "Trail" keyword
    const patterns = [
      /^([A-Z][^.!?:]{3,80})\s+Trail/,  // "Half Dome Trail"
      /([A-Z][^.!?:]{3,80})\s+Trail/,   // "The Half Dome Trail"
      /Trail:\s+([A-Z][^.!?:]{3,80})/,  // "Trail: Half Dome"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let name = match[1].trim();

        // Clean up name
        name = name.replace(/^(The|A)\s+/i, '');

        // Skip generic names
        if (name.length < 5 || name.toLowerCase().includes('trail map')) {
          continue;
        }

        return name + ' Trail';
      }
    }

    return null;
  }

  /**
   * Remove duplicate trails
   */
  private deduplicateTrails(trails: RawTrailData[]): RawTrailData[] {
    const seen = new Set<string>();
    return trails.filter((trail) => {
      const key = trail.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract distance from text context
   */
  private extractDistance(text: string): number | undefined {
    // Patterns: "10.5 miles", "10.5 mi", "10.5-mile"
    const patterns = [
      /(\d+\.?\d*)\s*miles?/i,
      /(\d+\.?\d*)\s*mi\b/i,
      /(\d+\.?\d*)-mile/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const distance = parseFloat(match[1]);
        if (distance > 0 && distance < 100) {
          return distance;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract elevation gain from text context
   */
  private extractElevation(text: string): number | undefined {
    // Patterns: "2,000 feet", "2000 ft", "2,000-foot"
    const patterns = [
      /(\d{1,2},?\d{3})\s*feet/i,
      /(\d{1,2},?\d{3})\s*ft\b/i,
      /(\d{1,2},?\d{3})-foot/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const elevation = parseInt(match[1].replace(/,/g, ''));
        if (elevation > 0 && elevation < 20000) {
          return elevation;
        }
      }
    }

    return undefined;
  }

  private getStateCode(parkCode: string): string {
    const states: Record<string, string> = {
      yose: 'CA',
      grca: 'AZ',
      zion: 'UT',
      romo: 'CO',
      acad: 'ME',
      grte: 'WY',
      olym: 'WA',
      yell: 'WY',
      glac: 'MT',
      grsm: 'TN',
    };

    return states[parkCode] || 'US';
  }
}
