import type { FitnessLevel, ProfilePoint } from "@/lib/planGenerator";

export type TrainingPlanInputs = {
  hike: {
    distanceMiles: number;
    elevationGainFt: number;
    profilePoints: ProfilePoint[];
  };
  fitnessLevel: FitnessLevel;
  targetDate: string;
  trainingStartDate: string;
  daysPerWeek: number;
  preferredDays: number[];
  anyDays: boolean;
  baselineMinutes: number;
  constraints: {
    treadmillMaxInclinePercent: number;
    treadmillSessionsPerWeek: number;
    outdoorHikesPerWeek: number;
    maxSpeedMph: number;
  };
  recoveryDaysPerWeek: number;
  includeStrength: boolean;
  strengthOnCardioDays: boolean;
};

export type TrainingPlanOutput = {
  totalWeeks: number;
  warnings: string[];
  summary: {
    daysPerWeek: number;
    preferredDays: number[];
    averageWeeklyMinutes: number;
  };
  weeks: TrainingWeek[];
};

export type TrainingWeek = {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalMinutes: number;
  notes: string;
  focus: string;
  days: TrainingDay[];
};

export type TrainingDay = {
  date: string;
  dayName: string;
  workouts: TrainingWorkout[];
};

export type TrainingWorkout = {
  id: string;
  type: WorkoutType;
  durationMinutes: number;
  inclineTarget?: number;
  notes?: string;
  segments?: TrainingSegment[];
};

export type TrainingSegment = {
  index: number;
  minutes: number;
  inclinePct: number;
  speedMph: number;
  note?: string;
};

export type WorkoutType =
  | "Treadmill intervals"
  | "Zone 2 incline walk"
  | "Strength"
  | "Outdoor long hike"
  | "Recovery / mobility"
  | "Rest day";

export type StrengthBlock = {
  durationMinutes: number;
  notes: string;
};

export type TrainingFormValues = {
  trainingStartDate: string;
  targetDate: string;
  daysPerWeek: number;
  preferredDays: number[];
  anyDays: boolean;
  baselineMinutes: number;
  treadmillMaxInclinePercent: number;
  maxSpeedMph: number;
  treadmillSessionsPerWeek: number;
  outdoorHikesPerWeek: number;
  recoveryDaysPerWeek: number;
  includeStrength: boolean;
  strengthOnCardioDays: boolean;
};

export type TrainingFormErrors = Partial<Record<keyof TrainingFormValues, string>> & {
  preferredDaysLimit?: string;
};
