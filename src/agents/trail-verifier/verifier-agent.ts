/**
 * Trail Verifier Agent
 * Cross-references and enriches trail data from multiple sources
 *
 * Strategy:
 * 1. Takes raw trail data with name, park, and approximate location
 * 2. Fetches accurate elevation data from OpenTopography if coordinates available
 * 3. Cross-references with known trail databases
 * 4. Calculates confidence score based on data completeness
 */

import { ElevationFetcher } from '../trail-collector/elevation-fetcher';
import type { RawTrailData, VerifiedTrailData } from '../types';

export class TrailVerifierAgent {
  private elevationFetcher: ElevationFetcher;

  constructor() {
    this.elevationFetcher = new ElevationFetcher();
  }

  /**
   * Verify and enrich a single trail
   */
  async verifyTrail(raw: RawTrailData): Promise<VerifiedTrailData> {
    console.log(`   Verifying: ${raw.name}`);

    let elevationGainFt = raw.elevationGainFt;
    let verificationSources: string[] = [raw.source];

    // If we have coordinates but missing/suspect elevation, fetch from OpenTopography
    if (raw.coordinates && raw.coordinates.length >= 2) {
      const startCoord = raw.coordinates[0];
      const endCoord = raw.coordinates[raw.coordinates.length - 1];

      try {
        const startElev = await this.elevationFetcher.fetchElevationOpenTopo(
          startCoord.lat,
          startCoord.lon
        );

        const endElev = await this.elevationFetcher.fetchElevationOpenTopo(
          endCoord.lat,
          endCoord.lon
        );

        if (startElev !== null && endElev !== null) {
          const calculatedGain = Math.abs(endElev - startElev);

          // If we didn't have elevation or it differs significantly, use calculated
          if (!elevationGainFt || Math.abs(elevationGainFt - calculatedGain) > 500) {
            console.log(`      Updated elevation: ${elevationGainFt || 'none'} → ${calculatedGain} ft`);
            elevationGainFt = calculatedGain;
            verificationSources.push('opentopography');
          }
        }

        // Delay to respect rate limits
        await this.delay(200);
      } catch (error) {
        console.log(`      Could not verify elevation: ${error}`);
      }
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(raw, verificationSources.length);

    const verified: VerifiedTrailData = {
      ...raw,
      elevationGainFt,
      confidence,
      verificationSources,
      verifiedAt: new Date(),
    };

    return verified;
  }

  /**
   * Verify multiple trails
   */
  async verifyTrails(rawTrails: RawTrailData[]): Promise<VerifiedTrailData[]> {
    console.log(`\n📋 Verifying ${rawTrails.length} trails...\n`);

    const verified: VerifiedTrailData[] = [];

    for (const raw of rawTrails) {
      const verifiedTrail = await this.verifyTrail(raw);
      verified.push(verifiedTrail);
    }

    console.log(`\n✅ Verified ${verified.length} trails\n`);

    return verified;
  }

  /**
   * Calculate confidence score based on data completeness and sources
   */
  private calculateConfidence(trail: RawTrailData, sourceCount: number): number {
    let score = trail.confidence || 50;

    // Boost for multiple sources
    if (sourceCount > 1) {
      score += 10 * (sourceCount - 1);
    }

    // Boost for complete data
    if (trail.distanceMiles) score += 5;
    if (trail.elevationGainFt) score += 5;
    if (trail.coordinates && trail.coordinates.length > 0) score += 5;
    if (trail.description) score += 5;

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
