/**
 * AI Plan Parser and Validator
 *
 * Parses and validates AI-generated training plans
 * Converts AI responses to database format
 */

import type { Prisma } from '@prisma/client';

export type WorkoutType = 'cardio' | 'strength' | 'rest' | 'recovery' | 'mixed';
export type IntensityLevel = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface AIWorkout {
  day: number;
  type: WorkoutType;
  title: string;
  duration: number;
  intensity: IntensityLevel;
  distanceMiles: number;
  elevationGainFt: number;
  description: string;
  equipment?: string;
}

export interface AIWeek {
  weekNumber: number;
  weekFocus: string;
  totalMiles: number;
  totalElevation: number;
  workouts: AIWorkout[];
}

export interface AIPlan {
  planTitle: string;
  planDescription: string;
  totalWeeks: number;
  targetHikeName: string;
  fitnessLevel: string;
  weeks: AIWeek[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate AI-generated plan structure
 */
export function validateAIPlan(plan: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type guard
  if (!plan || typeof plan !== 'object') {
    errors.push('Plan must be an object');
    return { valid: false, errors, warnings };
  }

  const p = plan as Record<string, unknown>;

  // Check required fields
  if (!p.planTitle || typeof p.planTitle !== 'string') {
    errors.push('planTitle is required and must be a string');
  }

  if (!p.planDescription || typeof p.planDescription !== 'string') {
    errors.push('planDescription is required and must be a string');
  }

  if (!p.totalWeeks || typeof p.totalWeeks !== 'number') {
    errors.push('totalWeeks is required and must be a number');
  }

  if (!p.weeks || !Array.isArray(p.weeks)) {
    errors.push('weeks must be an array');
    return { valid: false, errors, warnings };
  }

  const weeks = p.weeks as unknown[];

  // Validate week count
  if (weeks.length !== p.totalWeeks) {
    warnings.push(`Week count mismatch: expected ${p.totalWeeks}, got ${weeks.length}`);
  }

  // Validate each week
  weeks.forEach((week, weekIndex) => {
    if (!week || typeof week !== 'object') {
      errors.push(`Week ${weekIndex + 1} must be an object`);
      return;
    }

    const w = week as Record<string, unknown>;

    if (!w.weekNumber || typeof w.weekNumber !== 'number') {
      errors.push(`Week ${weekIndex + 1}: weekNumber is required`);
    }

    if (!w.weekFocus || typeof w.weekFocus !== 'string') {
      warnings.push(`Week ${weekIndex + 1}: weekFocus is missing or invalid`);
    }

    if (!w.workouts || !Array.isArray(w.workouts)) {
      errors.push(`Week ${weekIndex + 1}: workouts must be an array`);
      return;
    }

    const workouts = w.workouts as unknown[];

    // Validate workout count
    if (workouts.length === 0) {
      errors.push(`Week ${weekIndex + 1}: must have at least one workout`);
    }

    if (workouts.length > 7) {
      warnings.push(`Week ${weekIndex + 1}: has more than 7 workouts (${workouts.length})`);
    }

    // Validate each workout
    workouts.forEach((workout, workoutIndex) => {
      if (!workout || typeof workout !== 'object') {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: must be an object`);
        return;
      }

      const wo = workout as Record<string, unknown>;

      // Required fields
      if (typeof wo.day !== 'number' || wo.day < 1 || wo.day > 7) {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: day must be 1-7`);
      }

      if (!wo.type || typeof wo.type !== 'string') {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: type is required`);
      }

      if (!wo.title || typeof wo.title !== 'string') {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: title is required`);
      }

      if (typeof wo.duration !== 'number' || wo.duration < 0) {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: duration must be a positive number`);
      }

      if (!wo.intensity || typeof wo.intensity !== 'string') {
        errors.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: intensity is required`);
      }

      if (typeof wo.distanceMiles !== 'number' || wo.distanceMiles < 0) {
        warnings.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: distanceMiles should be a positive number`);
      }

      if (typeof wo.elevationGainFt !== 'number' || wo.elevationGainFt < 0) {
        warnings.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: elevationGainFt should be a positive number`);
      }

      if (!wo.description || typeof wo.description !== 'string') {
        warnings.push(`Week ${weekIndex + 1}, Workout ${workoutIndex + 1}: description is missing`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert AI plan to database format
 */
export function convertAIPlanToDBFormat(aiPlan: AIPlan, metadata: {
  hikeId: string;
  userId: string;
  trainingStartDate: Date;
  targetDate: Date;
  aiModel: string;
  generationPrompt: string;
  generationMetadata: unknown;
}) {
  // Calculate total miles and elevation for each week
  const weeksWithTotals = aiPlan.weeks.map(week => {
    const totalMiles = week.workouts.reduce((sum, w) => sum + (w.distanceMiles || 0), 0);
    const totalElevation = week.workouts.reduce((sum, w) => sum + (w.elevationGainFt || 0), 0);

    return {
      ...week,
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalElevation: Math.round(totalElevation),
    };
  });

  return {
    hikeId: metadata.hikeId,
    userId: metadata.userId,
    trainingStartDate: metadata.trainingStartDate,
    targetDate: metadata.targetDate,
    settings: {
      planTitle: aiPlan.planTitle,
      planDescription: aiPlan.planDescription,
      fitnessLevel: aiPlan.fitnessLevel,
      totalWeeks: aiPlan.totalWeeks,
    } as unknown as Prisma.InputJsonValue,
    weeks: weeksWithTotals as unknown as Prisma.InputJsonValue,
    aiGenerated: true,
    aiModel: metadata.aiModel,
    generationPrompt: metadata.generationPrompt,
    generationMetadata: metadata.generationMetadata as unknown as Prisma.InputJsonValue,
  };
}

/**
 * Sanitize and fix common AI response issues
 */
export function sanitizeAIPlan(plan: unknown): AIPlan {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Invalid plan structure');
  }

  const p = plan as Record<string, unknown>;

  // Ensure weeks array exists
  if (!Array.isArray(p.weeks)) {
    throw new Error('Plan must have weeks array');
  }

  // Fix week numbers and sort
  const weeks = (p.weeks as unknown[])
    .map((week, index) => {
      if (!week || typeof week !== 'object') {
        throw new Error(`Week ${index + 1} is invalid`);
      }

      const w = week as Record<string, unknown>;

      return {
        weekNumber: typeof w.weekNumber === 'number' ? w.weekNumber : index + 1,
        weekFocus: typeof w.weekFocus === 'string' ? w.weekFocus : `Week ${index + 1}`,
        totalMiles: typeof w.totalMiles === 'number' ? w.totalMiles : 0,
        totalElevation: typeof w.totalElevation === 'number' ? w.totalElevation : 0,
        workouts: Array.isArray(w.workouts) ? w.workouts.map((wo, woIndex) => {
          if (!wo || typeof wo !== 'object') {
            throw new Error(`Week ${index + 1}, workout ${woIndex + 1} is invalid`);
          }

          const workout = wo as Record<string, unknown>;

          return {
            day: typeof workout.day === 'number' ? workout.day : woIndex + 1,
            type: (workout.type as WorkoutType) || 'cardio',
            title: typeof workout.title === 'string' ? workout.title : 'Workout',
            duration: typeof workout.duration === 'number' ? workout.duration : 0,
            intensity: (workout.intensity as IntensityLevel) || 'moderate',
            distanceMiles: typeof workout.distanceMiles === 'number' ? workout.distanceMiles : 0,
            elevationGainFt: typeof workout.elevationGainFt === 'number' ? workout.elevationGainFt : 0,
            description: typeof workout.description === 'string' ? workout.description : '',
            equipment: typeof workout.equipment === 'string' ? workout.equipment : undefined,
          };
        }) : [],
      };
    })
    .sort((a, b) => a.weekNumber - b.weekNumber);

  return {
    planTitle: typeof p.planTitle === 'string' ? p.planTitle : 'Training Plan',
    planDescription: typeof p.planDescription === 'string' ? p.planDescription : '',
    totalWeeks: typeof p.totalWeeks === 'number' ? p.totalWeeks : weeks.length,
    targetHikeName: typeof p.targetHikeName === 'string' ? p.targetHikeName : '',
    fitnessLevel: typeof p.fitnessLevel === 'string' ? p.fitnessLevel : 'intermediate',
    weeks,
  };
}

/**
 * Calculate plan statistics
 */
export function calculatePlanStats(plan: AIPlan) {
  let totalMiles = 0;
  let totalElevation = 0;
  let totalWorkouts = 0;
  let cardioWorkouts = 0;
  let strengthWorkouts = 0;
  let restDays = 0;

  plan.weeks.forEach(week => {
    week.workouts.forEach(workout => {
      totalWorkouts++;
      totalMiles += workout.distanceMiles || 0;
      totalElevation += workout.elevationGainFt || 0;

      if (workout.type === 'cardio') cardioWorkouts++;
      else if (workout.type === 'strength') strengthWorkouts++;
      else if (workout.type === 'rest') restDays++;
    });
  });

  return {
    totalWeeks: plan.totalWeeks,
    totalWorkouts,
    cardioWorkouts,
    strengthWorkouts,
    restDays,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalElevation: Math.round(totalElevation),
    avgWorkoutsPerWeek: Math.round((totalWorkouts / plan.totalWeeks) * 10) / 10,
    avgMilesPerWeek: Math.round((totalMiles / plan.totalWeeks) * 10) / 10,
  };
}
