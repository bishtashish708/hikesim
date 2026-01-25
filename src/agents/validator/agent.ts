/**
 * Data Validation Agent
 * Uses AI to intelligently validate and score trail data quality
 */

import { OpenRouterClient } from '../base/openrouter-client';
import { RawTrail, ValidatedTrail, ValidationResult, ProfilePoint } from '../base/types';
import { areSimilarNames, saveToFile } from '../base/utils';

export class DataValidationAgent {
  private ai: OpenRouterClient;
  private model = 'anthropic/claude-3.5-sonnet'; // Better reasoning for validation

  constructor(openRouterApiKey: string) {
    this.ai = new OpenRouterClient(openRouterApiKey);
  }

  /**
   * Validate trails using AI-powered quality checks
   */
  async validateTrails(trails: RawTrail[]): Promise<ValidationResult> {
    console.log(`\n🤖 AI Validation Agent starting for ${trails.length} trails...`);

    const startTime = Date.now();
    const validTrails: ValidatedTrail[] = [];
    const invalidTrails: RawTrail[] = [];
    const duplicates: RawTrail[] = [];

    let totalCost = 0;
    let totalQualityScore = 0;

    // Step 1: Check for duplicates
    console.log('\n🔍 Checking for duplicates...');
    const uniqueTrails = this.removeDuplicates(trails, duplicates);
    console.log(`  ✓ Removed ${duplicates.length} duplicates, ${uniqueTrails.length} unique trails remaining`);

    // Step 2: Validate each trail with AI
    console.log('\n🧠 AI validating trails...');

    for (let i = 0; i < uniqueTrails.length; i++) {
      const trail = uniqueTrails[i];
      console.log(`\n  [${i + 1}/${uniqueTrails.length}] Validating: ${trail.name}`);

      try {
        const { data, cost } = await this.ai.chatJSON<{
          isValid: boolean;
          qualityScore: number;
          errors: string[];
          warnings: string[];
          enrichedData: {
            distanceMiles?: number;
            elevationGainFt?: number;
            difficulty?: string;
            trailType?: string;
            description?: string;
          };
        }>(
          [
            {
              role: 'system',
              content: `You are a trail data validation expert. Validate trail data quality and enrich missing information.

VALIDATION RULES:
1. Trail must have a name (not "Unnamed Trail" or generic)
2. Distance must be between 0.1 and 100 miles
3. Elevation gain must be between 0 and 15,000 ft
4. Coordinates should be within reasonable bounds
5. Difficulty must be: Easy, Moderate, Hard, or Very Hard

QUALITY SCORING (0-100):
- Has name: +15 points
- Has distance: +15 points
- Has elevation: +15 points
- Has coordinates (GPS path): +20 points
- Has difficulty rating: +10 points
- Has description: +10 points
- Has trail type: +5 points
- Has surface type: +5 points
- Coordinates > 50 points: +5 bonus

ENRICHMENT:
- Estimate missing distance from coordinates
- Estimate missing elevation from coordinates
- Infer difficulty from distance + elevation
- Infer trail type from coordinates (loop vs out-and-back)
- Generate brief description if missing

CRITICAL: Respond with ONLY valid JSON. NO explanations, NO markdown, NO extra text before or after the JSON object.

Format:
{
  "isValid": true,
  "qualityScore": 85,
  "errors": [],
  "warnings": [],
  "enrichedData": {
    "distanceMiles": 5.2,
    "elevationGainFt": 1200,
    "difficulty": "Moderate",
    "trailType": "Loop",
    "description": "Brief description"
  }
}`,
            },
            {
              role: 'user',
              content: `Validate this trail data:\n\n${JSON.stringify(trail, null, 2)}`,
            },
          ],
          this.model,
          { temperature: 0.2, maxTokens: 2000 }
        );

        totalCost += cost;
        totalQualityScore += data.qualityScore;

        console.log(`    Quality Score: ${data.qualityScore}/100 | Cost: $${cost.toFixed(4)}`);

        if (data.isValid && data.qualityScore >= 40) {
          // Create validated trail with enriched data
          const validatedTrail: ValidatedTrail = {
            ...trail,
            distanceMiles: data.enrichedData.distanceMiles || trail.distanceMiles || 0,
            elevationGainFt: data.enrichedData.elevationGainFt || trail.elevationGainFt || 0,
            difficulty: data.enrichedData.difficulty || trail.difficulty,
            trailType: data.enrichedData.trailType || trail.trailType,
            description: data.enrichedData.description || trail.description,
            profilePoints: this.generateProfilePoints(trail),
            qualityScore: data.qualityScore,
            validationErrors: data.errors,
            validationWarnings: data.warnings,
          };

          validTrails.push(validatedTrail);
          console.log(`    ✅ VALID - Added to database queue`);
        } else {
          invalidTrails.push(trail);
          console.log(`    ❌ INVALID - ${data.errors.join(', ')}`);
        }

        if (data.warnings.length > 0) {
          console.log(`    ⚠️  Warnings: ${data.warnings.join(', ')}`);
        }
      } catch (error) {
        console.error(`    ✗ Error validating trail:`, error);
        invalidTrails.push(trail);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgScore = validTrails.length > 0 ? totalQualityScore / validTrails.length : 0;

    console.log(`\n✅ Validation complete in ${duration}s`);
    console.log(`💰 Total AI cost: $${totalCost.toFixed(4)}`);
    console.log(`📊 Results:`);
    console.log(`   - Valid: ${validTrails.length}`);
    console.log(`   - Invalid: ${invalidTrails.length}`);
    console.log(`   - Duplicates: ${duplicates.length}`);
    console.log(`   - Average quality score: ${avgScore.toFixed(1)}/100`);

    const result: ValidationResult = {
      totalTrails: trails.length,
      validTrails,
      invalidTrails,
      duplicates,
      summary: {
        passed: validTrails.length,
        failed: invalidTrails.length,
        duplicates: duplicates.length,
        averageQualityScore: avgScore,
      },
    };

    // Save to file
    await saveToFile(result, `validated/yosemite-validated-${Date.now()}.json`);

    return result;
  }

  /**
   * Remove duplicate trails
   */
  private removeDuplicates(trails: RawTrail[], duplicates: RawTrail[]): RawTrail[] {
    const unique: RawTrail[] = [];
    const seen = new Set<string>();

    for (const trail of trails) {
      // Check by name similarity
      const isDuplicate = unique.some(existing => areSimilarNames(existing.name, trail.name));

      if (isDuplicate) {
        duplicates.push(trail);
      } else {
        unique.push(trail);
        seen.add(trail.name.toLowerCase());
      }
    }

    return unique;
  }

  /**
   * Generate elevation profile points
   */
  private generateProfilePoints(trail: RawTrail): ProfilePoint[] {
    // If we have coordinates, we could call an elevation API here
    // For now, return empty array or simple linear profile
    if (!trail.coordinates || trail.coordinates.length < 2) {
      return [];
    }

    // Simple linear elevation profile
    const points: ProfilePoint[] = [];
    const totalDistance = trail.distanceMiles || 0;
    const totalElevation = trail.elevationGainFt || 0;

    if (totalDistance > 0) {
      const numPoints = Math.min(trail.coordinates.length, 20);
      for (let i = 0; i < numPoints; i++) {
        points.push({
          distanceMiles: (totalDistance * i) / (numPoints - 1),
          elevationFt: (totalElevation * i) / (numPoints - 1),
        });
      }
    }

    return points;
  }
}
