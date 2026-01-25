/**
 * Improved OSM Data Collection Agent
 * - Better coordinate sampling
 * - Token limit protection
 * - Progress tracking
 */

import { OpenRouterClient } from '../base/openrouter-client';
import { OSMClient, OSMTrailData } from './osm-client';
import { RawTrail, CollectionResult } from '../base/types';
import { saveToFile } from '../base/utils';

export interface CollectionProgress {
  phase: 'fetch' | 'parse' | 'complete';
  current: number;
  total: number;
  message?: string;
}

export type ProgressCallback = (progress: CollectionProgress) => void;

export class ImprovedCollectionAgent {
  private ai: OpenRouterClient;
  private osm: OSMClient;
  private model = 'openai/gpt-4o-mini';

  constructor(openRouterApiKey: string) {
    this.ai = new OpenRouterClient(openRouterApiKey);
    this.osm = new OSMClient();
  }

  /**
   * Collect trails with progress tracking
   */
  async collectTrailsForPark(
    parkName: string,
    parkCode: string,
    onProgress?: ProgressCallback
  ): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Fetch from OSM
      onProgress?.({ phase: 'fetch', current: 0, total: 1, message: 'Fetching from OpenStreetMap...' });

      const osmData = await this.osm.fetchTrailsForPark(parkName);

      onProgress?.({ phase: 'fetch', current: 1, total: 1, message: `Found ${osmData.elements.length} OSM elements` });

      if (!osmData.elements || osmData.elements.length === 0) {
        return {
          parkName,
          parkCode,
          trailsFound: 0,
          trails: [],
          source: 'osm',
          timestamp: new Date().toISOString(),
          errors: ['No trails found in OSM data'],
        };
      }

      // Step 2: Parse with AI (with progress)
      const trails = await this.parseOSMDataWithAI(
        osmData.elements,
        parkName,
        parkCode,
        onProgress
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      onProgress?.({
        phase: 'complete',
        current: trails.length,
        total: trails.length,
        message: `Completed in ${duration}s`,
      });

      const result: CollectionResult = {
        parkName,
        parkCode,
        trailsFound: trails.length,
        trails,
        source: 'osm',
        timestamp: new Date().toISOString(),
        errors,
      };

      // Save to file
      await saveToFile(result, `raw/${parkCode}-${Date.now()}.json`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Parse OSM data with progress tracking and better error handling
   */
  private async parseOSMDataWithAI(
    elements: OSMTrailData[],
    parkName: string,
    parkCode: string,
    onProgress?: ProgressCallback
  ): Promise<RawTrail[]> {
    const trails: RawTrail[] = [];
    let totalCost = 0;

    // Aggressively sample coordinates to reduce token usage
    const processedElements = elements.map(el => this.sampleElement(el));

    const batchSize = 3; // Reduced from 5 to 3 for safety
    const totalBatches = Math.ceil(processedElements.length / batchSize);

    for (let i = 0; i < processedElements.length; i += batchSize) {
      const batch = processedElements.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      onProgress?.({
        phase: 'parse',
        current: batchNum,
        total: totalBatches,
        message: `Processing batch ${batchNum}/${totalBatches}`,
      });

      try {
        const { data, cost } = await this.ai.chatJSON<{ trails: any[] }>(
          [
            {
              role: 'system',
              content: `Extract trail data from OpenStreetMap elements. Return ONLY valid JSON with NO explanations.

Rules:
1. Only extract named trails (skip "Unnamed" or generic paths)
2. Calculate distance from coordinates if missing
3. Estimate elevation gain if available
4. Convert difficulty to: Easy, Moderate, Hard, Very Hard
5. Skip service roads and sidewalks

Required JSON format (NO extra text):
{
  "trails": [
    {
      "name": "Trail Name",
      "distanceMiles": 5.2,
      "elevationGainFt": 1200,
      "latitude": 37.7,
      "longitude": -119.6,
      "coordinates": [[37.7, -119.6]],
      "difficulty": "Moderate",
      "trailType": "Loop",
      "surface": "Dirt",
      "description": "Brief description"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `Extract trails from: ${JSON.stringify(batch)}`,
            },
          ],
          this.model,
          { temperature: 0.1, maxTokens: 4000 }
        );

        totalCost += cost;

        if (data.trails && Array.isArray(data.trails)) {
          for (const trail of data.trails) {
            const rawTrail: RawTrail = {
              name: trail.name,
              distanceMiles: trail.distanceMiles || 0,
              elevationGainFt: trail.elevationGainFt || 0,
              latitude: trail.latitude || 0,
              longitude: trail.longitude || 0,
              coordinates: trail.coordinates || [],
              difficulty: trail.difficulty,
              trailType: trail.trailType || 'Out & Back',
              surface: trail.surface || 'Unknown',
              description: trail.description || '',
              parkName,
              stateCode: this.getStateCode(parkCode),
              countryCode: 'US',
              sourceUrl: `https://www.openstreetmap.org/way/${batch[0]?.id || 'unknown'}`,
              source: 'osm',
            };

            trails.push(rawTrail);
          }
        }
      } catch (error: any) {
        // Check if it's a token limit error
        if (error.message?.includes('maximum context length')) {
          console.error(`    ✗ Token limit exceeded for batch ${batchNum}, skipping...`);
        } else {
          console.error(`    ✗ Error in batch ${batchNum}:`, error.message);
        }
      }
    }

    return trails;
  }

  /**
   * Aggressively sample coordinates to reduce size
   */
  private sampleElement(element: OSMTrailData): OSMTrailData {
    if (element.geometry && Array.isArray(element.geometry)) {
      // Keep only every 20th point (or max 10 points)
      const maxPoints = 10;
      const step = Math.max(1, Math.floor(element.geometry.length / maxPoints));

      element.geometry = element.geometry.filter((_, idx) => idx % step === 0 || idx === element.geometry!.length - 1);
    }

    // Remove verbose tags we don't need
    if (element.tags) {
      const keep = ['name', 'highway', 'surface', 'sac_scale', 'trail_visibility', 'distance', 'ele'];
      element.tags = Object.fromEntries(
        Object.entries(element.tags).filter(([key]) => keep.includes(key))
      );
    }

    return element;
  }

  /**
   * Collect trails with custom OSM query (for Indian trails)
   */
  async collectWithCustomQuery(
    osmQuery: string,
    regionName: string,
    onProgress?: ProgressCallback
  ): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Fetch from OSM with custom query
      onProgress?.({ phase: 'fetch', current: 0, total: 1, message: `Querying OSM for trails in ${regionName}...` });

      const osmData = await this.osm.fetchWithCustomQuery(osmQuery);

      onProgress?.({ phase: 'fetch', current: 1, total: 1, message: `✓ Found ${osmData.elements.length} trail elements from OSM` });

      if (!osmData || osmData.elements.length === 0) {
        return {
          trailsFound: 0,
          trails: [],
          errors: ['No OSM data found for this region'],
          durationSeconds: (Date.now() - startTime) / 1000,
        };
      }

      // Step 2: Parse OSM elements into trail objects with AI
      const trails = await this.parseOSMDataWithAI(
        osmData.elements,
        regionName,
        'india', // Use 'india' as park code for Indian trails
        onProgress
      );

      // Save results
      const result: CollectionResult = {
        trailsFound: trails.length,
        trails,
        errors,
        durationSeconds: (Date.now() - startTime) / 1000,
      };

      await saveToFile(result, `raw/${regionName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`);

      onProgress?.({
        phase: 'complete',
        current: trails.length,
        total: trails.length,
        message: `Completed in ${result.durationSeconds.toFixed(1)}s`,
      });

      return result;
    } catch (error: any) {
      errors.push(error.message);
      return {
        trailsFound: 0,
        trails: [],
        errors,
        durationSeconds: (Date.now() - startTime) / 1000,
      };
    }
  }

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
