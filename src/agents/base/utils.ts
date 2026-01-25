/**
 * Utility functions for agent system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate distance between two GPS coordinates in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate elevation gain from GPS path
 */
export function calculateElevationGain(profilePoints: { elevationFt: number }[]): number {
  if (!profilePoints || profilePoints.length < 2) return 0;

  let totalGain = 0;
  for (let i = 1; i < profilePoints.length; i++) {
    const diff = profilePoints[i].elevationFt - profilePoints[i - 1].elevationFt;
    if (diff > 0) {
      totalGain += diff;
    }
  }
  return Math.round(totalGain);
}

/**
 * Calculate total distance from GPS coordinates
 */
export function calculateTotalDistance(coordinates: [number, number][]): number {
  if (!coordinates || coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lon1] = coordinates[i - 1];
    const [lat2, lon2] = coordinates[i];
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }
  return totalDistance;
}

/**
 * Save data to JSON file
 */
export async function saveToFile(data: any, filename: string): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Saved to ${filePath}`);
}

/**
 * Load data from JSON file
 */
export async function loadFromFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), 'data', filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Chunk array into smaller batches
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Format timestamp
 */
export function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if trail names are similar (for duplicate detection)
 */
export function areSimilarNames(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const ratio = Math.min(n1.length, n2.length) / Math.max(n1.length, n2.length);
    return ratio > 0.7;
  }

  return false;
}

/**
 * Generate elevation profile from coordinates
 * Note: This is a placeholder - real implementation would call elevation API
 */
export async function generateElevationProfile(
  coordinates: [number, number][]
): Promise<{ distanceMiles: number; elevationFt: number }[]> {
  // For now, return empty array
  // TODO: Integrate with USGS Elevation API or similar
  return [];
}
