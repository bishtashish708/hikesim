/**
 * NPS-based Data Collection Agent
 * Uses National Park Service API + AI enrichment
 */

import { OpenRouterClient } from '../base/openrouter-client';
import { NPSClient, NPSTrail } from './nps-client';
import { RawTrail, CollectionResult } from '../base/types';
import { saveToFile } from '../base/utils';

export interface ProgressCallback {
  (phase: string, current: number, total: number, message?: string): void;
}

export class NPSCollectionAgent {
  private ai: OpenRouterClient;
  private nps: NPSClient;
  private model = 'openai/gpt-4o-mini'; // Fast and cheap for extraction

  constructor(openRouterApiKey: string, npsApiKey: string) {
    this.ai = new OpenRouterClient(openRouterApiKey);
    this.nps = new NPSClient(npsApiKey);
  }

  /**
   * Collect trails for a specific park with progress tracking
   */
  async collectTrailsForPark(
    parkName: string,
    parkCode: string,
    onProgress?: ProgressCallback
  ): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Phase 1: Fetch from NPS API
      onProgress?.('fetch', 0, 1, `Fetching trails from NPS API for ${parkName}...`);

      const npsData = await this.nps.fetchTrailsForPark(parkCode);
      const npsTrails = npsData.data;

      onProgress?.('fetch', 1, 1, `Found ${npsTrails.length} trails from NPS API`);

      if (npsTrails.length === 0) {
        return {
          parkName,
          parkCode,
          trailsFound: 0,
          trails: [],
          source: 'nps',
          timestamp: new Date().toISOString(),
          errors: ['No trails found in NPS data'],
        };
      }

      // Phase 2: Enrich with AI
      onProgress?.('enrich', 0, npsTrails.length, 'Enriching trail data with AI...');

      const trails: RawTrail[] = [];
      let totalCost = 0;

      for (let i = 0; i < npsTrails.length; i++) {
        const npsTrail = npsTrails[i];

        onProgress?.(
          'enrich',
          i + 1,
          npsTrails.length,
          `Enriching: ${npsTrail.title.substring(0, 40)}...`
        );

        try {
          const enriched = await this.enrichTrailWithAI(npsTrail, parkName, parkCode);
          trails.push(enriched.trail);
          totalCost += enriched.cost;
        } catch (error) {
          const errorMsg = `Failed to enrich ${npsTrail.title}: ${error}`;
          errors.push(errorMsg);
          console.error(`    ✗ ${errorMsg}`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      onProgress?.('complete', trails.length, trails.length, `Collection complete in ${duration}s`);

      const result: CollectionResult = {
        parkName,
        parkCode,
        trailsFound: trails.length,
        trails,
        source: 'nps',
        timestamp: new Date().toISOString(),
        errors,
      };

      // Save to file
      await saveToFile(result, `raw/${parkCode}-${Date.now()}.json`);

      console.log(`\n💰 Total AI cost: $${totalCost.toFixed(4)}`);
      console.log(`✅ Collection complete! Found ${trails.length} trails in ${duration}s`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Enrich NPS trail data with AI-estimated distance, elevation, difficulty
   */
  private async enrichTrailWithAI(
    npsTrail: NPSTrail,
    parkName: string,
    parkCode: string
  ): Promise<{ trail: RawTrail; cost: number }> {
    // Extract coordinates
    const coords = this.nps.parseLatLong(npsTrail.latLong);

    const { data, cost } = await this.ai.chatJSON<{
      distanceMiles: number;
      elevationGainFt: number;
      difficulty: string;
      trailType: string;
      description: string;
    }>(
      [
        {
          role: 'system',
          content: `You are a trail data expert. Given trail information from the National Park Service, estimate missing data.

IMPORTANT RULES:
1. Estimate realistic distance in miles (0.1-50 typical range)
2. Estimate elevation gain in feet (0-5000 typical for day hikes)
3. Set difficulty as: Easy, Moderate, Hard, or Very Hard
4. Set trail type as: Loop, Out & Back, or Point to Point
5. Write a concise 1-2 sentence description
6. Base estimates on trail name, park location, and any available context
7. Return ONLY valid JSON with no extra text

Example:
{
  "distanceMiles": 5.2,
  "elevationGainFt": 1200,
  "difficulty": "Moderate",
  "trailType": "Out & Back",
  "description": "Scenic trail through forest with waterfall views."
}`,
        },
        {
          role: 'user',
          content: `Park: ${parkName}
Trail Name: ${npsTrail.title}
NPS Description: ${npsTrail.bodyText?.substring(0, 500) || 'No description available'}
Activities: ${npsTrail.activities?.map(a => a.name).join(', ') || 'None listed'}

Estimate the distance, elevation gain, difficulty, trail type, and provide a brief description.`,
        },
      ],
      this.model,
      { temperature: 0.3, maxTokens: 500 }
    );

    const trail: RawTrail = {
      name: npsTrail.title,
      distanceMiles: data.distanceMiles,
      elevationGainFt: data.elevationGainFt,
      latitude: coords?.lat || 0,
      longitude: coords?.lon || 0,
      coordinates: coords ? [[coords.lat, coords.lon]] : [],
      difficulty: data.difficulty,
      trailType: data.trailType,
      surface: 'Unknown',
      description: data.description || npsTrail.bodyText?.substring(0, 300) || '',
      parkName,
      stateCode: npsTrail.states || this.getStateCode(parkCode),
      countryCode: 'US',
      sourceUrl: npsTrail.url,
      source: 'nps',
    };

    return { trail, cost };
  }

  /**
   * Get state code from park code
   */
  private getStateCode(parkCode: string): string {
    const mapping: Record<string, string> = {
      yose: 'CA',
      grca: 'AZ',
      zion: 'UT',
      yell: 'WY',
      glac: 'MT',
      romo: 'CO',
      grsm: 'TN',
      acad: 'ME',
      grte: 'WY',
      olym: 'WA',
    };

    return mapping[parkCode.toLowerCase()] || 'US';
  }
}
