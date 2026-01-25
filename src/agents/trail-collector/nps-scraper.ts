/**
 * NPS Website Scraper
 * Scrapes trail information from official NPS park websites
 * Each park has different HTML structure, so this requires park-specific logic
 */

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
   * Parse trail information from HTML
   * Note: This is simplified - real implementation needs cheerio/puppeteer
   */
  private parseTrailsFromHTML(
    html: string,
    parkCode: string,
    parkName: string,
    sourceUrl: string
  ): RawTrailData[] {
    const trails: RawTrailData[] = [];

    // Simple regex patterns to extract trail info
    // In production, use a proper HTML parser like Cheerio

    // Look for trail names (common patterns)
    const trailNamePattern = />([\w\s\-']+Trail)<\//gi;
    const nameMatches = html.matchAll(trailNamePattern);

    for (const match of nameMatches) {
      const name = match[1].trim();

      // Skip if name is too generic
      if (name.length < 5 || name.toLowerCase().includes('trail maps')) {
        continue;
      }

      // Try to find distance and elevation nearby
      const contextStart = Math.max(0, match.index! - 500);
      const contextEnd = Math.min(html.length, match.index! + 500);
      const context = html.slice(contextStart, contextEnd);

      const distance = this.extractDistance(context);
      const elevation = this.extractElevation(context);

      trails.push({
        source: 'scrape',
        confidence: 60, // Web scraping has lower confidence
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
      });
    }

    // Remove duplicates by name
    const uniqueTrails = trails.filter(
      (trail, index, self) => index === self.findIndex((t) => t.name === trail.name)
    );

    return uniqueTrails;
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
