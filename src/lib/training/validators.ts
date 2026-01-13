import type { TrainingFormErrors, TrainingFormValues } from "@/lib/training/types";

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function sanitizeNumber(
  value: string,
  min: number,
  max: number,
  step?: number
): number {
  // Parse and normalize numeric strings (including leading zeros) into bounded numbers.
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  const clamped = clampNumber(parsed, min, max);
  if (!step) return clamped;
  const rounded = Math.round(clamped / step) * step;
  return Number(rounded.toFixed(step < 1 ? 1 : 0));
}

export function trimPreferredDays(preferred: number[], limit: number) {
  return preferred.slice(0, Math.max(0, limit));
}

export function validateTrainingForm(values: TrainingFormValues): TrainingFormErrors {
  const errors: TrainingFormErrors = {};
  if (!values.trainingStartDate || !values.targetDate) {
    errors.trainingStartDate = "Start date and target date are required.";
  } else if (new Date(values.trainingStartDate) > new Date(values.targetDate)) {
    errors.trainingStartDate = "Training start date must be before the target hike date.";
  }
  if (values.daysPerWeek < 1 || values.daysPerWeek > 7) {
    errors.daysPerWeek = "Training days per week must be between 1 and 7.";
  }
  if (!values.anyDays && values.preferredDays.length > values.daysPerWeek) {
    errors.preferredDaysLimit = "You selected too many preferred days.";
  }
  if (values.treadmillSessionsPerWeek > values.daysPerWeek) {
    errors.treadmillSessionsPerWeek = "Treadmill sessions cannot exceed training days.";
  }
  if (values.treadmillSessionsPerWeek + values.outdoorHikesPerWeek === 0) {
    errors.treadmillSessionsPerWeek = "Choose at least 1 treadmill or outdoor session per week.";
  }
  const totalCardio = values.treadmillSessionsPerWeek + values.outdoorHikesPerWeek;
  const strengthSessions = values.includeStrength ? values.strengthSessionsPerWeek : 0;
  if (totalCardio + strengthSessions > values.daysPerWeek) {
    errors.treadmillSessionsPerWeek = "Cardio + strength sessions must fit within your training days.";
  }
  if (values.includeStrength && values.strengthOnCardioDays && strengthSessions > totalCardio) {
    errors.strengthSessionsPerWeek = "Strength sessions must fit within your cardio sessions.";
  }
  if (values.baselineMinutes < 0 || values.baselineMinutes > 2000) {
    errors.baselineMinutes = "Baseline minutes should be between 0 and 2000.";
  }
  if (values.treadmillMaxInclinePercent < 0 || values.treadmillMaxInclinePercent > 20) {
    errors.treadmillMaxInclinePercent = "Max incline should be between 0 and 20%.";
  }
  if (values.maxSpeedMph < 1 || values.maxSpeedMph > 8) {
    errors.maxSpeedMph = "Max speed should be between 1.0 and 8.0 mph.";
  }
  if (values.outdoorHikesPerWeek < 0 || values.outdoorHikesPerWeek > 6) {
    errors.outdoorHikesPerWeek = "Outdoor hikes should be between 0 and 6 per week.";
  }
  if (values.includeStrength && values.strengthSessionsPerWeek < 0) {
    errors.strengthSessionsPerWeek = "Strength sessions should be zero or more.";
  }
  if (!values.includeStrength && values.strengthSessionsPerWeek > 0) {
    errors.strengthSessionsPerWeek = "Strength sessions require Cardio + Strength focus.";
  }

  if (!values.anyDays) {
    const requiredDays = values.treadmillSessionsPerWeek +
      values.outdoorHikesPerWeek +
      (values.includeStrength && !values.strengthOnCardioDays ? strengthSessions : 0);
    if (values.preferredDays.length < requiredDays) {
      errors.preferredDaysLimit =
        "Preferred days must cover all required sessions or enable Any days.";
    }
  }
  return errors;
}

export type PlanIntensity = "normal" | "moderate" | "aggressive";

export function getPlanIntensity(baselineMinutes: number, totalSessions: number): PlanIntensity {
  if (baselineMinutes <= 30 && totalSessions >= 5) return "aggressive";
  if (baselineMinutes <= 30 && totalSessions >= 4) return "moderate";
  if (baselineMinutes > 60 && totalSessions >= 6) return "aggressive";
  return "normal";
}
