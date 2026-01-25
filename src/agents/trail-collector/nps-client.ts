/**
 * NPS (National Park Service) API Client
 * Fetches official trail data from NPS API
 */

import { API_CONFIGS } from '../config';
import type { RawTrailData, NPSApiResponse } from '../types';

export class NPSClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = API_CONFIGS.nps.apiKey;
    this.baseUrl = API_CONFIGS.nps.baseUrl;

    if (!this.apiKey) {
      throw new Error('NPS_API_KEY not found in environment variables');
    }
  }

  /**
   * Fetch things to do (activities) for a specific park
   * NPS API doesn't have dedicated "trails" endpoint, so we use activities
   */
  async fetchThingsToDo(parkCode: string): Promise<RawTrailData[]> {
    const url = `${this.baseUrl}/thingstodo?parkCode=${parkCode}&api_key=${this.apiKey}&limit=100`;

    console.log(`📡 Fetching NPS activities for park: ${parkCode}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NPS API error: ${response.status} - ${await response.text()}`);
    }

    const data: NPSApiResponse = await response.json();

    console.log(`   Found ${data.total} activities from NPS`);

    // Filter for hiking/trail activities
    const trails = data.data
      .filter((activity) => {
        const name = (activity.title || activity.fullName || '').toLowerCase();
        const desc = (activity.shortDescription || activity.description || '').toLowerCase();

        return (
          name.includes('trail') ||
          name.includes('hike') ||
          name.includes('hiking') ||
          desc.includes('trail') ||
          desc.includes('hiking')
        );
      })
      .map((activity) => this.convertToRawTrail(activity, parkCode));

    console.log(`   ✓ Extracted ${trails.length} trail-related activities`);

    return trails;
  }

  /**
   * Convert NPS API response to RawTrailData
   */
  private convertToRawTrail(activity: any, parkCode: string): RawTrailData {
    const coords =
      activity.latitude && activity.longitude
        ? [
            {
              lat: parseFloat(activity.latitude),
              lon: parseFloat(activity.longitude),
            },
          ]
        : undefined;

    return {
      source: 'nps',
      confidence: 70, // NPS is official but lacks detailed trail data
      name: activity.title || activity.fullName || 'Unknown Trail',
      parkName: this.getParkNameFromCode(parkCode),
      parkCode,
      stateCode: this.getStateCodeFromPark(parkCode),
      coordinates: coords,
      description: activity.shortDescription || activity.description || '',
      url: activity.url,
      tags: activity.topics?.map((t: any) => t.name) || [],
      metadata: {
        collectedAt: new Date(),
        collectorVersion: '1.0.0',
        sourceUrl: activity.url,
      },
    };
  }

  /**
   * Get full park name from code
   */
  private getParkNameFromCode(code: string): string {
    const parks: Record<string, string> = {
      yose: 'Yosemite National Park',
      grca: 'Grand Canyon National Park',
      zion: 'Zion National Park',
      romo: 'Rocky Mountain National Park',
      acad: 'Acadia National Park',
      grte: 'Grand Teton National Park',
      olym: 'Olympic National Park',
      yell: 'Yellowstone National Park',
      glac: 'Glacier National Park',
      grsm: 'Great Smoky Mountains National Park',
    };

    return parks[code] || code;
  }

  /**
   * Get state code from park code
   */
  private getStateCodeFromPark(code: string): string {
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

    return states[code] || 'US';
  }

  /**
   * Test NPS API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/parks?limit=1&api_key=${this.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}
