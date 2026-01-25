/**
 * National Park Service API Client
 * Fetches official trail data from NPS API
 */

export interface NPSTrail {
  id: string;
  title: string;
  relatedParks: { states: string; parkCode: string; designation: string; fullName: string; url: string }[];
  url: string;
  bodyText?: string;
  latitude?: string;
  longitude?: string;
  latLong?: string;
  tags?: string[];
  geometryPoiId?: string;
  activities?: { id: string; name: string }[];
  topics?: { id: string; name: string }[];
  states?: string;
}

export interface NPSResponse<T> {
  total: string;
  data: T[];
  limit: string;
  start: string;
}

export class NPSClient {
  private baseUrl = 'https://developer.nps.gov/api/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch trails for a specific park
   */
  async fetchTrailsForPark(parkCode: string): Promise<NPSResponse<NPSTrail>> {
    const url = `${this.baseUrl}/thingstodo?parkCode=${parkCode}&api_key=${this.apiKey}&limit=100`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NPS API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();

    // Filter for trails only
    data.data = data.data.filter((item: NPSTrail) => {
      const title = item.title.toLowerCase();
      const tags = item.tags?.join(' ').toLowerCase() || '';
      const activities = item.activities?.map(a => a.name.toLowerCase()).join(' ') || '';

      return (
        title.includes('trail') ||
        title.includes('hike') ||
        tags.includes('trail') ||
        tags.includes('hiking') ||
        activities.includes('hiking') ||
        activities.includes('trail')
      );
    });

    return data;
  }

  /**
   * Fetch detailed trail information
   */
  async fetchTrailDetails(trailId: string): Promise<NPSTrail> {
    const url = `${this.baseUrl}/thingstodo/${trailId}?api_key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NPS API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0];
  }

  /**
   * Parse lat/long from NPS format
   */
  parseLatLong(latLong?: string): { lat: number; lon: number } | null {
    if (!latLong) return null;

    // Format: "lat:37.748997, long:-119.589104"
    const match = latLong.match(/lat:([-\d.]+),\s*long:([-\d.]+)/);
    if (!match) return null;

    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
    };
  }
}
