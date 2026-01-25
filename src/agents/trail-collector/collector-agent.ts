/**
 * Trail Collector Agent
 * Orchestrates data collection from multiple FREE sources:
 * 1. NPS API - Official trail names
 * 2. NPS Website Scraping - Detailed trail info
 * 3. OpenTopography - Elevation data (if coordinates available)
 */

import { NPSClient } from './nps-client';
import { NPSScraper } from './nps-scraper';
import { ElevationFetcher } from './elevation-fetcher';
import { NATIONAL_PARKS, COLLECTION_CONFIG } from '../config';
import type { RawTrailData, CollectionReport } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class TrailCollectorAgent {
  private npsClient: NPSClient;
  private npsScraper: NPSScraper;
  private elevationFetcher: ElevationFetcher;

  constructor() {
    this.npsClient = new NPSClient();
    this.npsScraper = new NPSScraper();
    this.elevationFetcher = new ElevationFetcher();
  }

  /**
   * Collect trails for a specific park
   */
  async collectTrailsForPark(parkCode: string): Promise<RawTrailData[]> {
    const park = NATIONAL_PARKS.find((p) => p.code === parkCode);

    if (!park) {
      throw new Error(`Park not found: ${parkCode}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏔️  Collecting trails for ${park.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const allTrails: RawTrailData[] = [];

    // Step 1: Fetch from NPS API
    console.log('📡 Step 1: Fetching from NPS API...');
    try {
      const npsTrails = await this.npsClient.fetchThingsToDo(parkCode);
      allTrails.push(...npsTrails);
      console.log(`   ✓ Got ${npsTrails.length} trails from NPS API\n`);
    } catch (error) {
      console.error(`   ❌ NPS API error:`, error);
    }

    // Step 2: Scrape NPS website for detailed info
    console.log('🕷️  Step 2: Scraping NPS website...');
    try {
      const scrapedTrails = await this.npsScraper.scrapeTrailsForPark(
        parkCode,
        park.name
      );
      allTrails.push(...scrapedTrails);
      console.log(`   ✓ Got ${scrapedTrails.length} trails from scraping\n`);
    } catch (error) {
      console.error(`   ❌ Scraping error:`, error);
    }

    // Step 3: Delay to respect rate limits
    await this.delay(COLLECTION_CONFIG.apiDelay);

    console.log(`📊 Total raw trails collected: ${allTrails.length}\n`);

    // Save raw data
    await this.saveRawData(parkCode, allTrails);

    return allTrails;
  }

  /**
   * Collect trails for all parks
   */
  async collectAllParks(): Promise<CollectionReport[]> {
    console.log('\n🚀 Starting trail collection for all parks\n');

    const reports: CollectionReport[] = [];

    for (const park of NATIONAL_PARKS) {
      const startTime = Date.now();

      try {
        const trails = await this.collectTrailsForPark(park.code);

        const report: CollectionReport = {
          parkName: park.name,
          parkCode: park.code,
          totalCollected: trails.length,
          totalVerified: 0, // Will be filled by Verifier Agent
          totalValidated: 0, // Will be filled by Validator Agent
          totalInserted: 0, // Will be filled by Validator Agent
          rejected: {
            tooShort: 0,
            lowElevation: 0,
            lowConfidence: 0,
            duplicate: 0,
            other: 0,
          },
          errors: [],
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };

        reports.push(report);

        console.log(`✅ ${park.name}: ${trails.length} trails collected\n`);
      } catch (error) {
        console.error(`❌ Error collecting ${park.name}:`, error);

        reports.push({
          parkName: park.name,
          parkCode: park.code,
          totalCollected: 0,
          totalVerified: 0,
          totalValidated: 0,
          totalInserted: 0,
          rejected: {
            tooShort: 0,
            lowElevation: 0,
            lowConfidence: 0,
            duplicate: 0,
            other: 0,
          },
          errors: [
            {
              trail: 'N/A',
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date(),
            },
          ],
          duration: Date.now() - startTime,
          timestamp: new Date(),
        });
      }

      // Delay between parks
      await this.delay(COLLECTION_CONFIG.apiDelay);
    }

    // Save summary report
    await this.saveSummaryReport(reports);

    return reports;
  }

  /**
   * Save raw trail data to file
   */
  private async saveRawData(parkCode: string, trails: RawTrailData[]): Promise<void> {
    const outputDir = COLLECTION_CONFIG.paths.raw;

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${parkCode}-trails-raw-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(trails, null, 2));

    console.log(`💾 Saved raw data: ${filepath}\n`);
  }

  /**
   * Save summary report
   */
  private async saveSummaryReport(reports: CollectionReport[]): Promise<void> {
    const outputDir = COLLECTION_CONFIG.paths.logs;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `collection-report-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    const summary = {
      totalParks: reports.length,
      totalTrails: reports.reduce((sum, r) => sum + r.totalCollected, 0),
      successfulParks: reports.filter((r) => r.totalCollected > 0).length,
      failedParks: reports.filter((r) => r.totalCollected === 0).length,
      timestamp: new Date(),
      reports,
    };

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));

    console.log(`\n📊 Summary Report:`);
    console.log(`   Total parks processed: ${summary.totalParks}`);
    console.log(`   Total trails collected: ${summary.totalTrails}`);
    console.log(`   Successful parks: ${summary.successfulParks}`);
    console.log(`   Failed parks: ${summary.failedParks}`);
    console.log(`\n💾 Full report saved: ${filepath}\n`);
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to all data sources
   */
  async testConnections(): Promise<{ nps: boolean }> {
    console.log('\n🔌 Testing data source connections...\n');

    const npsConnected = await this.npsClient.testConnection();
    console.log(`   NPS API: ${npsConnected ? '✅' : '❌'}`);

    return {
      nps: npsConnected,
    };
  }
}
