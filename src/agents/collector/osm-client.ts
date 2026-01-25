/**
 * OpenStreetMap Overpass API client
 * Fetches trail data from OSM
 */

export interface OSMTrailData {
  type: 'way' | 'relation';
  id: number;
  tags: {
    name?: string;
    highway?: string;
    route?: string;
    distance?: string;
    sac_scale?: string;
    surface?: string;
    description?: string;
    [key: string]: any;
  };
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat] - NOTE: OSM uses lon,lat
  };
  nodes?: number[];
  members?: any[];
}

export interface OSMResponse {
  elements: OSMTrailData[];
}

export class OSMClient {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  /**
   * Fetch trails for a specific park or region
   */
  async fetchTrailsForPark(
    parkName: string,
    boundingBox?: { south: number; west: number; north: number; east: number }
  ): Promise<OSMResponse> {
    const query = this.buildOverpassQuery(parkName, boundingBox);

    console.log(`\n🔍 Querying OSM for trails in ${parkName}...`);

    const response = await fetch(this.overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    console.log(`✓ Found ${data.elements?.length || 0} trail elements from OSM`);

    return data;
  }

  /**
   * Fetch trails with a custom Overpass QL query (for Indian trails)
   */
  async fetchWithCustomQuery(query: string): Promise<OSMResponse> {
    const response = await fetch(this.overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Build Overpass QL query for trails
   */
  private buildOverpassQuery(
    parkName: string,
    boundingBox?: { south: number; west: number; north: number; east: number }
  ): string {
    // For Yosemite, use known bounding box
    const bbox = boundingBox || this.getKnownParkBoundingBox(parkName);

    if (!bbox) {
      throw new Error(`No bounding box found for ${parkName}`);
    }

    // Query for hiking trails in the bounding box
    return `
[out:json][timeout:60];
(
  // Hiking paths with SAC scale (difficulty rating)
  way["highway"="path"]["sac_scale"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});

  // Marked hiking routes
  way["route"="hiking"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});

  // Hiking route relations
  relation["route"="hiking"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});

  // Tracks and footways that might be trails
  way["highway"="track"]["tracktype"~"grade[1-3]"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["highway"="footway"]["foot"!="no"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out body geom;
    `.trim();
  }

  /**
   * Known bounding boxes for major parks (Top 10 Most Visited US National Parks)
   */
  private getKnownParkBoundingBox(
    parkName: string
  ): { south: number; west: number; north: number; east: number } | null {
    const parks: Record<string, { south: number; west: number; north: number; east: number }> = {
      // 1. Great Smoky Mountains (12.9M visitors)
      'Great Smoky Mountains National Park': {
        south: 35.4,
        west: -84.0,
        north: 35.8,
        east: -83.0,
      },
      // 2. Grand Canyon (4.7M visitors)
      'Grand Canyon National Park': {
        south: 35.9,
        west: -112.5,
        north: 36.5,
        east: -111.5,
      },
      // 3. Zion (4.6M visitors)
      'Zion National Park': {
        south: 37.1,
        west: -113.2,
        north: 37.5,
        east: -112.8,
      },
      // 4. Rocky Mountain (4.3M visitors)
      'Rocky Mountain National Park': {
        south: 40.1,
        west: -105.9,
        north: 40.6,
        east: -105.4,
      },
      // 5. Acadia (3.9M visitors)
      'Acadia National Park': {
        south: 44.2,
        west: -68.4,
        north: 44.5,
        east: -68.1,
      },
      // 6. Grand Teton (3.4M visitors)
      'Grand Teton National Park': {
        south: 43.6,
        west: -111.1,
        north: 44.0,
        east: -110.4,
      },
      // 7. Olympic (3.2M visitors)
      'Olympic National Park': {
        south: 47.4,
        west: -124.7,
        north: 48.0,
        east: -122.8,
      },
      // 8. Yellowstone (3.0M visitors)
      'Yellowstone National Park': {
        south: 44.1,
        west: -111.2,
        north: 45.2,
        east: -109.8,
      },
      // 9. Yosemite (3.0M visitors)
      'Yosemite National Park': {
        south: 37.5,
        west: -120.0,
        north: 38.2,
        east: -119.2,
      },
      // 10. Glacier (2.9M visitors)
      'Glacier National Park': {
        south: 48.2,
        west: -114.5,
        north: 49.0,
        east: -113.3,
      },
    };

    return parks[parkName] || null;
  }

  /**
   * Parse OSM difficulty scale to our format
   */
  parseDifficulty(sacScale?: string): string | undefined {
    if (!sacScale) return undefined;

    const mapping: Record<string, string> = {
      'hiking': 'Easy',
      'mountain_hiking': 'Moderate',
      'demanding_mountain_hiking': 'Hard',
      'alpine_hiking': 'Very Hard',
      'demanding_alpine_hiking': 'Very Hard',
      'difficult_alpine_hiking': 'Very Hard',
    };

    return mapping[sacScale] || 'Moderate';
  }

  /**
   * Parse OSM surface to our format
   */
  parseSurface(surface?: string): string | undefined {
    if (!surface) return undefined;

    const mapping: Record<string, string> = {
      'paved': 'Paved',
      'asphalt': 'Paved',
      'concrete': 'Paved',
      'gravel': 'Gravel',
      'fine_gravel': 'Gravel',
      'dirt': 'Dirt',
      'ground': 'Dirt',
      'earth': 'Dirt',
      'rock': 'Rocky',
      'rocks': 'Rocky',
    };

    return mapping[surface] || surface;
  }
}
