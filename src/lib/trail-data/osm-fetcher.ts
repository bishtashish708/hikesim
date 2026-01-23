/**
 * OpenStreetMap Trail Data Fetcher
 * Queries OSM Overpass API for hiking trails
 */

import axios from 'axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const REQUEST_DELAY = 2000; // 2 seconds between requests (rate limiting)

export type OSMTrail = {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lon]
  tags: Record<string, string>;
  center: [number, number]; // [lat, lon]
  distance?: number; // in meters
};

export type TrailRegion = {
  country: 'US' | 'IN';
  state?: string;
  region?: string; // For India: Himalayas, Western Ghats, etc.
};

/**
 * Fetch hiking trails from OSM for a specific region
 */
export async function fetchTrailsFromOSM(
  region: TrailRegion,
  limit: number = 50
): Promise<OSMTrail[]> {
  const query = buildOverpassQuery(region, limit);

  try {
    const response = await axios.post(
      OVERPASS_API,
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return parseOverpassResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`OSM API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build Overpass QL query for hiking trails
 */
function buildOverpassQuery(region: TrailRegion, limit: number): string {
  const areaQuery = region.country === 'US' && region.state
    ? `area["ISO3166-2"="US-${region.state}"]->.searchArea;`
    : region.country === 'IN' && region.state
    ? `area["ISO3166-2"="IN-${region.state}"]->.searchArea;`
    : `area["ISO3166-1"="${region.country}"]->.searchArea;`;

  return `
[out:json][timeout:30];
${areaQuery}
(
  way["route"="hiking"](area.searchArea);
  way["highway"="path"]["sac_scale"](area.searchArea);
  relation["route"="hiking"](area.searchArea);
);
out geom ${limit};
  `.trim();
}

/**
 * Parse Overpass API response into our trail format
 */
function parseOverpassResponse(data: any): OSMTrail[] {
  if (!data.elements || !Array.isArray(data.elements)) {
    return [];
  }

  const trails: OSMTrail[] = [];

  for (const element of data.elements) {
    if (!element.tags?.name) continue; // Skip unnamed trails

    const coordinates = extractCoordinates(element);
    if (coordinates.length === 0) continue; // Skip if no coordinates

    const center = calculateCenter(coordinates);
    const distance = element.tags.distance
      ? parseDistance(element.tags.distance)
      : calculateDistance(coordinates);

    trails.push({
      id: `osm-${element.type}-${element.id}`,
      name: element.tags.name,
      coordinates,
      tags: element.tags,
      center,
      distance,
    });
  }

  return trails;
}

/**
 * Extract coordinates from OSM element
 */
function extractCoordinates(element: any): [number, number][] {
  const coords: [number, number][] = [];

  if (element.type === 'way' && element.geometry) {
    for (const node of element.geometry) {
      if (node.lat && node.lon) {
        coords.push([node.lat, node.lon]);
      }
    }
  } else if (element.type === 'relation' && element.members) {
    for (const member of element.members) {
      if (member.geometry) {
        for (const node of member.geometry) {
          if (node.lat && node.lon) {
            coords.push([node.lat, node.lon]);
          }
        }
      }
    }
  }

  return coords;
}

/**
 * Calculate center point of trail
 */
function calculateCenter(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) return [0, 0];

  const sum = coordinates.reduce(
    (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
    [0, 0]
  );

  return [sum[0] / coordinates.length, sum[1] / coordinates.length];
}

/**
 * Parse distance string from OSM tags (e.g., "5.2 km", "3.1 mi")
 */
function parseDistance(distanceStr: string): number {
  const match = distanceStr.match(/([\d.]+)\s*(km|mi|m)?/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case 'km':
      return value * 1000;
    case 'mi':
      return value * 1609.34;
    case 'm':
    default:
      return value;
  }
}

/**
 * Calculate distance along path using Haversine formula
 */
function calculateDistance(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += haversineDistance(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
  }

  return totalDistance;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Delay between requests to respect rate limits
 */
export async function delay(ms: number = REQUEST_DELAY): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract trail difficulty from OSM tags
 */
export function extractDifficulty(tags: Record<string, string>): string | null {
  // SAC scale (Swiss Alpine Club)
  const sacScale = tags.sac_scale;
  if (sacScale) {
    switch (sacScale) {
      case 'hiking':
        return 'Easy';
      case 'mountain_hiking':
        return 'Moderate';
      case 'demanding_mountain_hiking':
        return 'Hard';
      case 'alpine_hiking':
      case 'demanding_alpine_hiking':
      case 'difficult_alpine_hiking':
        return 'Very Hard';
    }
  }

  // Trail visibility
  const trailVisibility = tags.trail_visibility;
  if (trailVisibility) {
    switch (trailVisibility) {
      case 'excellent':
      case 'good':
        return 'Easy';
      case 'intermediate':
        return 'Moderate';
      case 'bad':
      case 'horrible':
      case 'no':
        return 'Hard';
    }
  }

  return null;
}

/**
 * Extract trail type from OSM tags
 */
export function extractTrailType(tags: Record<string, string>): string | null {
  const roundtrip = tags.roundtrip;
  if (roundtrip === 'yes') return 'Loop';

  const route = tags.route_type || tags.type;
  if (route === 'loop') return 'Loop';
  if (route === 'point_to_point') return 'Point to Point';

  // Default to Out & Back for hiking trails
  return 'Out & Back';
}

/**
 * Extract surface type from OSM tags
 */
export function extractSurface(tags: Record<string, string>): string | null {
  const surface = tags.surface;
  if (!surface) return null;

  switch (surface) {
    case 'paved':
    case 'asphalt':
    case 'concrete':
      return 'Paved';
    case 'gravel':
    case 'fine_gravel':
      return 'Gravel';
    case 'dirt':
    case 'earth':
    case 'ground':
      return 'Dirt';
    case 'rock':
    case 'stone':
    case 'rocky':
      return 'Rocky';
    default:
      return 'Dirt'; // Default
  }
}
