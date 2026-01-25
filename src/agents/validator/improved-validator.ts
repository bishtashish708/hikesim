/**
 * Improved Data Validation Agent
 * - Progress tracking
 * - Strict JSON enforcement
 * - Better error handling
 */

import { OpenRouterClient } from '../base/openrouter-client';
import { RawTrail, ValidatedTrail, ValidationResult, ProfilePoint } from '../base/types';
import { areSimilarNames, saveToFile } from '../base/utils';

export interface ValidationProgress {
  phase: 'dedup' | 'validate' | 'complete';
  current: number;
  total: number;
  message?: string;
}

export type ValidationProgressCallback = (progress: ValidationProgress) => void;

export class ImprovedValidationAgent {
  private ai: OpenRouterClient;
  private model = 'anthropic/claude-3.5-sonnet';

  constructor(openRouterApiKey: string) {
    this.ai = new OpenRouterClient(openRouterApiKey);
  }

  /**
   * Validate trails with progress tracking
   */
  async validateTrails(
    trails: RawTrail[],
    onProgress?: ValidationProgressCallback
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const validTrails: ValidatedTrail[] = [];
    const invalidTrails: RawTrail[] = [];
    const duplicates: RawTrail[] = [];

    let totalCost = 0;
    let totalQualityScore = 0;

    // Step 1: Deduplication
    onProgress?.({ phase: 'dedup', current: 0, total: 1, message: 'Checking for duplicates...' });

    const uniqueTrails = this.removeDuplicates(trails, duplicates);

    onProgress?.({
      phase: 'dedup',
      current: 1,
      total: 1,
      message: `Removed ${duplicates.length} duplicates, ${uniqueTrails.length} unique`,
    });

    // Step 2: AI Validation
    for (let i = 0; i < uniqueTrails.length; i++) {
      const trail = uniqueTrails[i];

      onProgress?.({
        phase: 'validate',
        current: i + 1,
        total: uniqueTrails.length,
        message: trail.name.substring(0, 40),
      });

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
              content: `Validate trail data and enrich missing fields.

VALIDATION:
1. Name must not be generic ("Unnamed", "Trail 1")
2. Distance: 0.1-100 miles
3. Elevation: 0-15000 ft
4. Difficulty: Easy, Moderate, Hard, Very Hard

QUALITY SCORE (0-100):
- Name: +15
- Distance: +15
- Elevation: +15
- Coordinates: +20
- Difficulty: +10
- Description: +10
- Trail type: +5
- Surface: +5

CRITICAL: Return ONLY valid JSON. NO explanations or extra text.

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
              content: JSON.stringify(trail),
            },
          ],
          this.model,
          { temperature: 0.2, maxTokens: 1000 }
        );

        totalCost += cost;
        totalQualityScore += data.qualityScore;

        if (data.isValid && data.qualityScore >= 40) {
          const validatedTrail: ValidatedTrail = {
            ...trail,
            distanceMiles: data.enrichedData.distanceMiles || trail.distanceMiles || 0,
            elevationGainFt: data.enrichedData.elevationGainFt || trail.elevationGainFt || 0,
            difficulty: data.enrichedData.difficulty || trail.difficulty,
            trailType: data.enrichedData.trailType || trail.trailType,
            description: data.enrichedData.description || trail.description,
            profilePoints: [],
            qualityScore: data.qualityScore,
            validationErrors: data.errors,
            validationWarnings: data.warnings,
          };

          validTrails.push(validatedTrail);
        } else {
          invalidTrails.push(trail);
        }
      } catch (error: any) {
        console.error(`    ✗ Error validating ${trail.name}:`, error.message);
        invalidTrails.push(trail);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgScore = validTrails.length > 0 ? totalQualityScore / validTrails.length : 0;

    onProgress?.({
      phase: 'complete',
      current: validTrails.length,
      total: validTrails.length,
      message: `Complete in ${duration}s | Avg score: ${avgScore.toFixed(1)}/100`,
    });

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

    await saveToFile(result, `validated/validated-${Date.now()}.json`);

    return result;
  }

  private removeDuplicates(trails: RawTrail[], duplicates: RawTrail[]): RawTrail[] {
    const unique: RawTrail[] = [];

    for (const trail of trails) {
      const isDuplicate = unique.some(existing => areSimilarNames(existing.name, trail.name));

      if (isDuplicate) {
        duplicates.push(trail);
      } else {
        unique.push(trail);
      }
    }

    return unique;
  }
}
