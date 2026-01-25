/**
 * Elevation Fetcher
 * Fetches elevation data from OpenTopography (FREE) and Google Elevation API
 */

import { API_CONFIGS } from '../config';
import type { Coordinate, ElevationPoint, ProfilePoint } from '../types';

export class ElevationFetcher {
  private googleApiKey: string;

  constructor() {
    this.googleApiKey = API_CONFIGS.googleMaps.apiKey;
  }

  /**
   * Fetch elevation profile from Google Elevation API
   * Cost: $5 per 1,000 requests
   */
  async fetchElevationProfileGoogle(
    coordinates: Coordinate[],
    samples: number = 100
  ): Promise<ProfilePoint[]> {
    if (!this.googleApiKey) {
      console.warn('⚠️  Google Maps API key not found, skipping elevation profile');
      return [];
    }

    // Google Elevation API accepts max 512 points
    const sampleInterval = Math.max(1, Math.floor(coordinates.length / Math.min(samples, 512)));
    const sampledCoords = coordinates.filter((_, i) => i % sampleInterval === 0);

    const path = sampledCoords.map((c) => `${c.lat},${c.lon}`).join('|');
    const url = `${API_CONFIGS.googleMaps.baseUrl}${API_CONFIGS.googleMaps.services.elevation}?path=${path}&samples=${sampledCoords.length}&key=${this.googleApiKey}`;

    console.log(`   🏔️  Fetching elevation profile (${sampledCoords.length} points)`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`   ❌ Google Elevation API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error(`   ❌ Google Elevation API error: ${data.status}`);
      return [];
    }

    const profilePoints: ProfilePoint[] = data.results.map(
      (point: ElevationPoint, index: number) => ({
        distanceMiles: this.calculateDistance(sampledCoords.slice(0, index + 1)),
        elevationFt: point.elevation * 3.28084, // meters to feet
        lat: point.location.lat,
        lon: point.location.lng,
      })
    );

    console.log(`   ✓ Generated elevation profile with ${profilePoints.length} points`);

    return profilePoints;
  }

  /**
   * Fetch elevation for a single point using OpenTopography (FREE)
   * Alternative to Google for single-point elevation
   */
  async fetchElevationOpenTopo(lat: number, lon: number): Promise<number | null> {
    const url = `${API_CONFIGS.openTopography.globalDemUrl}?demtype=SRTMGL3&south=${lat}&north=${lat}&west=${lon}&east=${lon}&outputFormat=JSON`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // OpenTopography returns elevation in meters
      return data.elevation ? data.elevation * 3.28084 : null;
    } catch (error) {
      console.error(`   ⚠️  OpenTopography error: ${error}`);
      return null;
    }
  }

  /**
   * Calculate total elevation gain from profile points
   */
  calculateElevationGain(profilePoints: ProfilePoint[]): number {
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
   * Calculate cumulative distance along coordinate path
   */
  private calculateDistance(coordinates: Coordinate[]): number {
    let totalMiles = 0;

    for (let i = 1; i < coordinates.length; i++) {
      totalMiles += this.haversineDistance(coordinates[i - 1], coordinates[i]);
    }

    return totalMiles;
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   */
  private haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 3959; // Earth radius in miles
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lon - coord1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Generate simple elevation profile from start/end elevations
   * Used when detailed coordinates are not available
   */
  generateSimpleProfile(
    distanceMiles: number,
    startElevation: number,
    endElevation: number,
    samples: number = 50
  ): ProfilePoint[] {
    const points: ProfilePoint[] = [];
    const elevationGain = endElevation - startElevation;

    for (let i = 0; i <= samples; i++) {
      const progress = i / samples;
      points.push({
        distanceMiles: distanceMiles * progress,
        elevationFt: startElevation + elevationGain * progress,
      });
    }

    return points;
  }
}
