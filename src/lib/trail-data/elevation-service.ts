/**
 * Elevation Profile Service using OpenTopoData
 * Generates elevation profiles from GPS coordinates
 */

import axios from 'axios';

const OPENTOPO_API = 'https://api.opentopodata.org/v1/srtm30m';
const MAX_LOCATIONS_PER_REQUEST = 100;
const REQUEST_DELAY = 1100; // 1.1 seconds (respect 1 req/sec limit)

export type ElevationPoint = {
  distanceMiles: number;
  elevationFt: number;
};

export type ElevationProfile = {
  points: ElevationPoint[];
  totalElevationGainFt: number;
  totalElevationLossFt: number;
  maxElevationFt: number;
  minElevationFt: number;
};

/**
 * Generate elevation profile from GPS coordinates
 */
export async function generateElevationProfile(
  coordinates: [number, number][], // [lat, lon]
  targetPointsCount: number = 50 // Number of elevation points to generate
): Promise<ElevationProfile> {
  if (coordinates.length === 0) {
    throw new Error('No coordinates provided');
  }

  // Sample coordinates to reduce API calls
  const sampledCoords = sampleCoordinates(coordinates, targetPointsCount);

  // Fetch elevation data in batches
  const elevations = await fetchElevationsInBatches(sampledCoords);

  // Calculate distances and create profile
  const profile = buildElevationProfile(elevations, coordinates);

  return profile;
}

/**
 * Sample coordinates to get ~N evenly spaced points
 */
function sampleCoordinates(
  coordinates: [number, number][],
  targetCount: number
): Array<{ lat: number; lon: number; originalIndex: number }> {
  if (coordinates.length <= targetCount) {
    return coordinates.map((coord, i) => ({
      lat: coord[0],
      lon: coord[1],
      originalIndex: i,
    }));
  }

  const step = coordinates.length / targetCount;
  const sampled: Array<{ lat: number; lon: number; originalIndex: number }> = [];

  for (let i = 0; i < targetCount; i++) {
    const index = Math.floor(i * step);
    if (index < coordinates.length) {
      sampled.push({
        lat: coordinates[index][0],
        lon: coordinates[index][1],
        originalIndex: index,
      });
    }
  }

  // Always include last point
  const lastIndex = coordinates.length - 1;
  if (sampled[sampled.length - 1].originalIndex !== lastIndex) {
    sampled.push({
      lat: coordinates[lastIndex][0],
      lon: coordinates[lastIndex][1],
      originalIndex: lastIndex,
    });
  }

  return sampled;
}

/**
 * Fetch elevations in batches (max 100 per request)
 */
async function fetchElevationsInBatches(
  coordinates: Array<{ lat: number; lon: number; originalIndex: number }>
): Promise<Array<{ lat: number; lon: number; elevation: number; index: number }>> {
  const results: Array<{ lat: number; lon: number; elevation: number; index: number }> = [];

  for (let i = 0; i < coordinates.length; i += MAX_LOCATIONS_PER_REQUEST) {
    const batch = coordinates.slice(i, i + MAX_LOCATIONS_PER_REQUEST);
    const elevations = await fetchElevationBatch(batch);
    results.push(...elevations);

    // Rate limiting delay
    if (i + MAX_LOCATIONS_PER_REQUEST < coordinates.length) {
      await delay(REQUEST_DELAY);
    }
  }

  return results;
}

/**
 * Fetch elevation for a batch of coordinates
 */
async function fetchElevationBatch(
  coordinates: Array<{ lat: number; lon: number; originalIndex: number }>
): Promise<Array<{ lat: number; lon: number; elevation: number; index: number }>> {
  // Build locations parameter: "lat,lon|lat,lon|..."
  const locations = coordinates
    .map(coord => `${coord.lat},${coord.lon}`)
    .join('|');

  try {
    const response = await axios.get(OPENTOPO_API, {
      params: { locations },
      timeout: 15000,
    });

    if (response.data.status !== 'OK') {
      throw new Error(`OpenTopoData error: ${response.data.error || 'Unknown error'}`);
    }

    return response.data.results.map((result: any, i: number) => ({
      lat: coordinates[i].lat,
      lon: coordinates[i].lon,
      elevation: result.elevation || 0,
      index: coordinates[i].originalIndex,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`OpenTopoData API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build elevation profile with distances
 */
function buildElevationProfile(
  elevations: Array<{ lat: number; lon: number; elevation: number; index: number }>,
  originalCoordinates: [number, number][]
): ElevationProfile {
  // Sort by original index
  elevations.sort((a, b) => a.index - b.index);

  // Calculate cumulative distances
  const points: ElevationPoint[] = [];
  let cumulativeDistanceMeters = 0;

  for (let i = 0; i < elevations.length; i++) {
    if (i > 0) {
      const prevElevation = elevations[i - 1];
      const currElevation = elevations[i];

      // Calculate distance between points using original coordinates
      const distance = calculateSegmentDistance(
        originalCoordinates,
        prevElevation.index,
        currElevation.index
      );

      cumulativeDistanceMeters += distance;
    }

    points.push({
      distanceMiles: metersToMiles(cumulativeDistanceMeters),
      elevationFt: metersToFeet(elevations[i].elevation),
    });
  }

  // Calculate elevation statistics
  const elevationGain = calculateElevationGain(points);
  const elevationLoss = calculateElevationLoss(points);
  const maxElevation = Math.max(...points.map(p => p.elevationFt));
  const minElevation = Math.min(...points.map(p => p.elevationFt));

  return {
    points,
    totalElevationGainFt: elevationGain,
    totalElevationLossFt: elevationLoss,
    maxElevationFt: maxElevation,
    minElevationFt: minElevation,
  };
}

/**
 * Calculate distance between two indices in coordinate array
 */
function calculateSegmentDistance(
  coordinates: [number, number][],
  startIndex: number,
  endIndex: number
): number {
  let distance = 0;

  for (let i = startIndex; i < endIndex && i < coordinates.length - 1; i++) {
    const [lat1, lon1] = coordinates[i];
    const [lat2, lon2] = coordinates[i + 1];
    distance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return distance;
}

/**
 * Calculate total elevation gain
 */
function calculateElevationGain(points: ElevationPoint[]): number {
  let gain = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevationFt - points[i - 1].elevationFt;
    if (diff > 0) {
      gain += diff;
    }
  }

  return Math.round(gain);
}

/**
 * Calculate total elevation loss
 */
function calculateElevationLoss(points: ElevationPoint[]): number {
  let loss = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevationFt - points[i - 1].elevationFt;
    if (diff < 0) {
      loss += Math.abs(diff);
    }
  }

  return Math.round(loss);
}

/**
 * Haversine distance formula (returns meters)
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
 * Convert meters to miles
 */
function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert meters to feet
 */
function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate difficulty based on distance and elevation gain
 * Using standard hiking difficulty formulas
 */
export function calculateDifficulty(
  distanceMiles: number,
  elevationGainFt: number
): string {
  // Calculate "effort" score
  // 1 mile = 1 point, 1000ft elevation = 1 point
  const effortScore = distanceMiles + elevationGainFt / 1000;

  if (effortScore < 5) return 'Easy';
  if (effortScore < 10) return 'Moderate';
  if (effortScore < 15) return 'Hard';
  return 'Very Hard';
}
