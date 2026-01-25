/**
 * Orchestrator - Coordinates the multi-agent trail collection system
 */

import { DataCollectionAgent } from './collector/agent';
import { DataValidationAgent } from './validator/agent';
import { ValidatedTrail, InsertResult } from './base/types';
import { prisma } from '../lib/db';
import { chunk, saveToFile } from './base/utils';

export class TrailCollectionOrchestrator {
  private collectionAgent: DataCollectionAgent;
  private validationAgent: DataValidationAgent;

  constructor(openRouterApiKey: string) {
    this.collectionAgent = new DataCollectionAgent(openRouterApiKey);
    this.validationAgent = new DataValidationAgent(openRouterApiKey);
  }

  /**
   * Collect and insert trails for a park
   */
  async collectAndInsertTrailsForPark(
    parkName: string,
    parkCode: string,
    options: {
      dryRun?: boolean;
      batchSize?: number;
      minQualityScore?: number;
    } = {}
  ): Promise<InsertResult> {
    const dryRun = options.dryRun ?? false;
    const batchSize = options.batchSize ?? 50;
    const minQualityScore = options.minQualityScore ?? 40;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Trail Collection Orchestrator`);
    console.log(`   Park: ${parkName}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE (will insert to database)'}`);
    console.log(`   Min Quality Score: ${minQualityScore}/100`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      // Phase 1: Collection
      console.log(`\n📥 PHASE 1: DATA COLLECTION`);
      console.log(`${'─'.repeat(80)}`);
      const collectionResult = await this.collectionAgent.collectTrailsForPark(parkName, parkCode);

      if (collectionResult.trailsFound === 0) {
        console.log(`\n❌ No trails found for ${parkName}`);
        return {
          attempted: 0,
          inserted: 0,
          skipped: 0,
          failed: 0,
          errors: ['No trails found'],
          insertedIds: [],
        };
      }

      // Phase 2: Validation
      console.log(`\n\n✅ PHASE 2: AI VALIDATION`);
      console.log(`${'─'.repeat(80)}`);
      const validationResult = await this.validationAgent.validateTrails(collectionResult.trails);

      // Filter by quality score
      const highQualityTrails = validationResult.validTrails.filter(
        t => t.qualityScore >= minQualityScore
      );

      console.log(`\n📊 Quality Filter: ${highQualityTrails.length}/${validationResult.validTrails.length} trails meet quality threshold`);

      if (highQualityTrails.length === 0) {
        console.log(`\n❌ No trails meet quality threshold of ${minQualityScore}/100`);
        return {
          attempted: validationResult.validTrails.length,
          inserted: 0,
          skipped: validationResult.validTrails.length,
          failed: 0,
          errors: ['No trails meet quality threshold'],
          insertedIds: [],
        };
      }

      // Phase 3: Database Insertion
      console.log(`\n\n💾 PHASE 3: DATABASE INSERTION`);
      console.log(`${'─'.repeat(80)}`);

      if (dryRun) {
        console.log(`\n🔍 DRY RUN - Would insert ${highQualityTrails.length} trails`);
        console.log(`\nSample trails that would be inserted:`);
        highQualityTrails.slice(0, 5).forEach((trail, i) => {
          console.log(`  ${i + 1}. ${trail.name} (${trail.distanceMiles} mi, ${trail.elevationGainFt} ft, quality: ${trail.qualityScore}/100)`);
        });

        return {
          attempted: highQualityTrails.length,
          inserted: 0,
          skipped: highQualityTrails.length,
          failed: 0,
          errors: [],
          insertedIds: [],
        };
      }

      const insertResult = await this.insertTrails(highQualityTrails, batchSize);

      // Final Summary
      console.log(`\n\n${'='.repeat(80)}`);
      console.log(`✅ COLLECTION COMPLETE`);
      console.log(`${'='.repeat(80)}`);
      console.log(`\n📊 Final Results:`);
      console.log(`   - Collected: ${collectionResult.trailsFound} trails`);
      console.log(`   - Validated: ${validationResult.validTrails.length} trails`);
      console.log(`   - High Quality: ${highQualityTrails.length} trails`);
      console.log(`   - Inserted: ${insertResult.inserted} trails`);
      console.log(`   - Skipped (duplicates): ${insertResult.skipped} trails`);
      console.log(`   - Failed: ${insertResult.failed} trails`);
      console.log(`\n💰 Total Cost: Check individual agent outputs above`);
      console.log(`${'='.repeat(80)}\n`);

      return insertResult;
    } catch (error) {
      console.error(`\n❌ Orchestrator error:`, error);
      throw error;
    }
  }

  /**
   * Insert validated trails into database
   */
  private async insertTrails(
    trails: ValidatedTrail[],
    batchSize: number
  ): Promise<InsertResult> {
    const result: InsertResult = {
      attempted: trails.length,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      insertedIds: [],
    };

    console.log(`\nInserting ${trails.length} trails in batches of ${batchSize}...`);

    const batches = chunk(trails, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n  Batch ${i + 1}/${batches.length} (${batch.length} trails)...`);

      for (const trail of batch) {
        try {
          // Check for duplicates by name
          const existing = await prisma.hike.findFirst({
            where: {
              name: trail.name,
              parkName: trail.parkName,
            },
          });

          if (existing) {
            console.log(`    ⏭️  Skipped (duplicate): ${trail.name}`);
            result.skipped++;
            continue;
          }

          // Insert trail
          const inserted = await prisma.hike.create({
            data: {
              name: trail.name,
              distanceMiles: trail.distanceMiles,
              elevationGainFt: trail.elevationGainFt,
              profilePoints: trail.profilePoints as any,
              countryCode: trail.countryCode || 'US',
              stateCode: trail.stateCode,
              latitude: trail.latitude,
              longitude: trail.longitude,
              coordinates: trail.coordinates as any,
              difficulty: trail.difficulty,
              trailType: trail.trailType,
              surface: trail.surface,
              city: trail.city,
              parkName: trail.parkName,
              region: trail.region,
              sourceUrl: trail.sourceUrl,
              description: trail.description,
              lastEnriched: new Date(),
              isSeed: false,
            },
          });

          result.insertedIds.push(inserted.id);
          result.inserted++;
          console.log(`    ✅ Inserted: ${trail.name} (quality: ${trail.qualityScore}/100)`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${trail.name}: ${errorMsg}`);
          result.failed++;
          console.log(`    ❌ Failed: ${trail.name} - ${errorMsg}`);
        }
      }

      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Batch insertion complete!`);
    console.log(`   - Inserted: ${result.inserted}`);
    console.log(`   - Skipped: ${result.skipped}`);
    console.log(`   - Failed: ${result.failed}`);

    // Save final result
    await saveToFile(result, `results/insert-result-${Date.now()}.json`);

    return result;
  }
}
