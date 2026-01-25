/**
 * Trail Validator Agent
 * Applies quality checks and inserts validated trails into database
 *
 * Quality Rules:
 * - Minimum 10 miles for out-and-back trails (user requirement)
 * - Minimum 500 ft elevation gain
 * - Minimum 75% confidence score
 * - Must have name, distance, elevation, park name
 */

import { prisma } from '../../lib/db';
import { QUALITY_RULES } from '../config';
import type { VerifiedTrailData, ValidatedTrail, CollectionReport } from '../types';

export class TrailValidatorAgent {
  /**
   * Validate and insert trails into database
   */
  async validateAndInsertTrails(
    verified: VerifiedTrailData[],
    parkCode: string,
    parkName: string
  ): Promise<CollectionReport> {
    console.log(`\n🔍 Validating ${verified.length} trails for ${parkName}...\n`);

    const report: CollectionReport = {
      parkName,
      parkCode,
      totalCollected: verified.length,
      totalVerified: verified.length,
      totalValidated: 0,
      totalInserted: 0,
      rejected: {
        tooShort: 0,
        lowElevation: 0,
        lowConfidence: 0,
        duplicate: 0,
        other: 0,
      },
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    const startTime = Date.now();

    for (const trail of verified) {
      try {
        const validation = this.validateTrail(trail);

        if (!validation.isValid) {
          console.log(`   ❌ Rejected: ${trail.name}`);
          console.log(`      Reason: ${validation.reason}`);

          // Track rejection reason
          if (validation.reason.includes('distance')) {
            report.rejected.tooShort++;
          } else if (validation.reason.includes('elevation')) {
            report.rejected.lowElevation++;
          } else if (validation.reason.includes('confidence')) {
            report.rejected.lowConfidence++;
          } else {
            report.rejected.other++;
          }

          continue;
        }

        report.totalValidated++;

        // Check for duplicates
        const existing = await prisma.hike.findFirst({
          where: {
            name: trail.name,
            parkName: trail.parkName,
          },
        });

        if (existing) {
          console.log(`   ⚠️  Duplicate: ${trail.name} (already exists)`);
          report.rejected.duplicate++;
          continue;
        }

        // Insert into database
        await this.insertTrail(trail);

        console.log(`   ✅ Inserted: ${trail.name}`);
        console.log(`      ${trail.distanceMiles}mi, ${trail.elevationGainFt}ft`);

        report.totalInserted++;
      } catch (error) {
        console.error(`   ❌ Error processing ${trail.name}:`, error);

        report.errors.push({
          trail: trail.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });
      }
    }

    report.duration = Date.now() - startTime;

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Validated: ${report.totalValidated}/${verified.length}`);
    console.log(`   Inserted: ${report.totalInserted}`);
    console.log(`   Rejected: ${verified.length - report.totalInserted}`);
    console.log(`      Too short: ${report.rejected.tooShort}`);
    console.log(`      Low elevation: ${report.rejected.lowElevation}`);
    console.log(`      Low confidence: ${report.rejected.lowConfidence}`);
    console.log(`      Duplicates: ${report.rejected.duplicate}`);
    console.log(`      Other: ${report.rejected.other}`);
    console.log(`   Errors: ${report.errors.length}\n`);

    return report;
  }

  /**
   * Validate a single trail against quality rules
   */
  private validateTrail(trail: VerifiedTrailData): { isValid: boolean; reason?: string } {
    // Must have required fields
    if (!trail.name || !trail.parkName) {
      return { isValid: false, reason: 'Missing required fields (name or park)' };
    }

    // Must have distance and elevation
    if (!trail.distanceMiles || !trail.elevationGainFt) {
      return { isValid: false, reason: 'Missing distance or elevation data' };
    }

    // Check minimum distance based on trail type
    const minDistance = QUALITY_RULES.minDistanceMiles;

    if (trail.distanceMiles < minDistance) {
      return {
        isValid: false,
        reason: `Distance too short: ${trail.distanceMiles}mi < ${minDistance}mi minimum`,
      };
    }

    // Check minimum elevation
    if (trail.elevationGainFt < QUALITY_RULES.minElevationFt) {
      return {
        isValid: false,
        reason: `Elevation too low: ${trail.elevationGainFt}ft < ${QUALITY_RULES.minElevationFt}ft minimum`,
      };
    }

    // Check confidence score
    if (trail.confidence < QUALITY_RULES.minConfidence) {
      return {
        isValid: false,
        reason: `Confidence too low: ${trail.confidence}% < ${QUALITY_RULES.minConfidence}% minimum`,
      };
    }

    // Check max limits for sanity
    if (trail.distanceMiles > QUALITY_RULES.maxDistanceMiles) {
      return {
        isValid: false,
        reason: `Distance too long: ${trail.distanceMiles}mi > ${QUALITY_RULES.maxDistanceMiles}mi maximum`,
      };
    }

    if (trail.elevationGainFt > QUALITY_RULES.maxElevationFt) {
      return {
        isValid: false,
        reason: `Elevation too high: ${trail.elevationGainFt}ft > ${QUALITY_RULES.maxElevationFt}ft maximum`,
      };
    }

    return { isValid: true };
  }

  /**
   * Insert trail into database
   */
  private async insertTrail(trail: VerifiedTrailData): Promise<void> {
    // Determine difficulty based on distance and elevation
    const difficulty = this.calculateDifficulty(trail.distanceMiles!, trail.elevationGainFt!);

    // Get coordinates (use first coordinate if available)
    const lat = trail.coordinates?.[0]?.lat || null;
    const lon = trail.coordinates?.[0]?.lon || null;

    await prisma.hike.create({
      data: {
        name: trail.name,
        parkName: trail.parkName,
        stateCode: trail.stateCode || 'US',
        countryCode: 'US',
        distanceMiles: trail.distanceMiles!,
        elevationGainFt: trail.elevationGainFt!,
        difficulty,
        trailType: trail.trailType || 'Out and Back',
        description: trail.description || `${trail.name} in ${trail.parkName}`,
        latitude: lat,
        longitude: lon,
        isSeed: false,
      },
    });
  }

  /**
   * Calculate difficulty rating based on distance and elevation
   */
  private calculateDifficulty(distanceMiles: number, elevationGainFt: number): string {
    // Simple difficulty calculation
    // Easy: < 5 mi and < 1000 ft
    // Moderate: < 10 mi and < 2000 ft
    // Hard: < 15 mi and < 4000 ft
    // Very Hard: everything else

    if (distanceMiles < 5 && elevationGainFt < 1000) {
      return 'Easy';
    } else if (distanceMiles < 10 && elevationGainFt < 2000) {
      return 'Moderate';
    } else if (distanceMiles < 15 && elevationGainFt < 4000) {
      return 'Hard';
    } else {
      return 'Very Hard';
    }
  }
}
