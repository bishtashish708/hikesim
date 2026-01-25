/**
 * Data Collection Agent
 * Uses AI to intelligently parse and extract trail data from OSM
 */

import { OpenRouterClient } from '../base/openrouter-client';
import { OSMClient, OSMTrailData } from './osm-client';
import { RawTrail, CollectionResult } from '../base/types';
import { calculateDistance, calculateTotalDistance, saveToFile } from '../base/utils';

export class DataCollectionAgent {
  private ai: OpenRouterClient;
  private osm: OSMClient;
  private model = 'openai/gpt-4o-mini'; // Fast and cheap for extraction

  constructor(openRouterApiKey: string) {
    this.ai = new OpenRouterClient(openRouterApiKey);
    this.osm = new OSMClient();
  }

  /**
   * Collect trails for a specific park using AI to parse OSM data
   */
  async collectTrailsForPark(parkName: string, parkCode: string): Promise<CollectionResult> {
    console.log(`\n🤖 AI Collection Agent starting for ${parkName}...`);

    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Fetch raw OSM data
      const osmData = await this.osm.fetchTrailsForPark(parkName);

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

      // Step 2: Use AI to intelligently parse and extract trails
      console.log(`\n🧠 Using AI to parse ${osmData.elements.length} OSM elements...`);
      const trails = await this.parseOSMDataWithAI(osmData.elements, parkName, parkCode);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Collection complete! Found ${trails.length} trails in ${duration}s`);

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
      await saveToFile(result, `raw/yosemite-${Date.now()}.json`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Use AI to parse OSM data into trail objects
   */
  private async parseOSMDataWithAI(
    elements: OSMTrailData[],
    parkName: string,
    parkCode: string
  ): Promise<RawTrail[]> {
    const trails: RawTrail[] = [];
    let totalCost = 0;

    // Process in smaller batches to avoid token limits
    const batchSize = 5;
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);

      console.log(`\n  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(elements.length / batchSize)}...`);

      try {
        const { data, cost } = await this.ai.chatJSON<{ trails: any[] }>(
          [
            {
              role: 'system',
              content: `You are a trail data extraction expert. Parse OpenStreetMap trail data and extract structured trail information.

IMPORTANT RULES:
1. Only extract trails with actual names (skip unnamed paths)
2. Calculate distance from coordinates if not provided
3. Estimate elevation gain if coordinates show significant altitude change
4. Convert OSM difficulty scales to: Easy, Moderate, Hard, Very Hard
5. Return ONLY trails that appear to be actual hiking trails (not service roads or sidewalks)
6. For coordinates arrays, include only every 5th-10th point to keep response size manageable (we'll get full path from OSM later)
7. Return JSON in this exact format:

{
  "trails": [
    {
      "name": "Trail Name",
      "distanceMiles": 5.2,
      "elevationGainFt": 1200,
      "latitude": 37.7,
      "longitude": -119.6,
      "coordinates": [[37.7, -119.6], [37.71, -119.61]],
      "difficulty": "Moderate",
      "trailType": "Loop",
      "surface": "Dirt",
      "description": "Brief trail description"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `Extract trail data for ${parkName} from these OSM elements:\n\n${JSON.stringify(batch, null, 2)}`,
            },
          ],
          this.model,
          { temperature: 0.1, maxTokens: 8000 }
        );

        totalCost += cost;

        // Process AI-extracted trails
        if (data.trails && Array.isArray(data.trails)) {
          for (const trail of data.trails) {
            // Validate and enrich
            const rawTrail: RawTrail = {
              name: trail.name,
              distanceMiles: trail.distanceMiles,
              elevationGainFt: trail.elevationGainFt || 0,
              latitude: trail.latitude,
              longitude: trail.longitude,
              coordinates: trail.coordinates,
              difficulty: trail.difficulty,
              trailType: trail.trailType || 'Out & Back',
              surface: trail.surface || 'Dirt',
              description: trail.description,
              parkName,
              stateCode: this.getStateCode(parkCode),
              countryCode: 'US',
              sourceUrl: `https://www.openstreetmap.org/way/${batch[0]?.id || 'unknown'}`,
              source: 'osm',
            };

            trails.push(rawTrail);
          }
        }

        console.log(`    ✓ Extracted ${data.trails?.length || 0} trails (cost: $${cost.toFixed(4)})`);
      } catch (error) {
        console.error(`    ✗ Error processing batch:`, error);
      }
    }

    console.log(`\n💰 Total AI cost: $${totalCost.toFixed(4)}`);

    return trails;
  }

  /**
   * Get state code from park code
   */
  private getStateCode(parkCode: string): string {
    const mapping: Record<string, string> = {
      'yose': 'CA',
      'grca': 'AZ',
      'zion': 'UT',
      'yell': 'WY',
      'glac': 'MT',
      'romo': 'CO',
      'shen': 'VA',
    };

    return mapping[parkCode.toLowerCase()] || 'US';
  }
}
