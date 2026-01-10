import { roundToStep } from "@/lib/formatters";
import { generatePlan, type FitnessLevel, type PlanSegment } from "@/lib/planGenerator";
import type {
  TrainingDay,
  TrainingPlanInputs,
  TrainingPlanOutput,
  TrainingSegment,
  TrainingWorkout,
  TrainingWeek,
  WorkoutType,
} from "@/lib/training/types";

// Build a week-by-week plan with hike-specific progression, including treadmill segments.

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function buildTrainingPlan(inputs: TrainingPlanInputs): TrainingPlanOutput {
  const startDate = toStartOfDay(parseLocalDate(inputs.trainingStartDate));
  const targetDate = toStartOfDay(parseLocalDate(inputs.targetDate));
  const totalWeeks = Math.max(1, Math.ceil((daysBetween(startDate, targetDate) + 1) / 7));
  const warnings: string[] = [];

  if (totalWeeks < 2) {
    warnings.push("Less than two weeks to your target date. Keep sessions short and stay fresh.");
  }

  const hikeDemands = deriveHikeDemands(inputs.hike, inputs.fitnessLevel);
  const minPrepWeeks = getMinPrepWeeks(inputs.hike.distanceMiles, inputs.hike.elevationGainFt);
  if (totalWeeks < minPrepWeeks) {
    warnings.push(
      `This hike typically requires at least ${minPrepWeeks} weeks of preparation. Your plan may not fully prepare you.`
    );
  }
  if (inputs.baselineMinutes <= 30 && inputs.constraints.treadmillSessionsPerWeek + inputs.constraints.outdoorHikesPerWeek >= inputs.daysPerWeek) {
    warnings.push("Ambitious plan: recommended only if you already train consistently.");
  }
  const peakTargets = buildPeakTargets(hikeDemands, totalWeeks);
  const weekVolumes = buildWeeklyVolumes(inputs.baselineMinutes, totalWeeks, peakTargets.weeklyVolumeTarget);
  const pickedDays = pickTrainingDays(inputs.daysPerWeek, inputs.preferredDays, inputs.anyDays);
  const averageWeeklyMinutes =
    weekVolumes.reduce((sum, value) => sum + value, 0) / Math.max(weekVolumes.length, 1);

  let lastLongHikeMinutes = Math.round(inputs.baselineMinutes * 0.4);
  const peakWeekIndex = totalWeeks > 1 ? Math.max(totalWeeks - 2, 0) : 0;
  const weeks: TrainingWeek[] = weekVolumes.map((weekVolume, index) => {
    const weekStart = addDays(startDate, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const isAdaptationWeek = inputs.baselineMinutes <= 30 && index < 2;
    const weekNoteText = weekNotes(isAdaptationWeek, index + 1, totalWeeks);
    const weekFocus = weekFocusLine(isAdaptationWeek, index + 1, totalWeeks);
    const effectiveDaysPerWeek = inputs.daysPerWeek;

    const { treadmillSessionsPerWeek, outdoorHikesPerWeek, strengthDaysPerWeek } =
      enforceSessionInvariant({
      daysPerWeek: effectiveDaysPerWeek,
      treadmillSessionsPerWeek: inputs.constraints.treadmillSessionsPerWeek,
      outdoorHikesPerWeek: inputs.constraints.outdoorHikesPerWeek,
      strengthDaysPerWeek: inputs.strengthDaysPerWeek,
      includeStrength: inputs.includeStrength,
      strengthOnCardioDays: inputs.strengthOnCardioDays,
    });
    if (
      treadmillSessionsPerWeek !== inputs.constraints.treadmillSessionsPerWeek ||
      outdoorHikesPerWeek !== inputs.constraints.outdoorHikesPerWeek ||
      strengthDaysPerWeek !== inputs.strengthDaysPerWeek
    ) {
      warnings.push("Total sessions must fit within your training days.");
    }

    const workoutsForWeek = buildWeekWorkouts({
      weekNumber: index + 1,
      totalWeeks,
      weekVolume,
      daysPerWeek: effectiveDaysPerWeek,
      treadmillSessionsPerWeek,
      outdoorHikesPerWeek,
      includeStrength: inputs.includeStrength,
      strengthDaysPerWeek,
      strengthOnCardioDays: inputs.strengthOnCardioDays,
    });

    const longSessionTarget = buildLongSessionTarget({
      baselineMinutes: inputs.baselineMinutes,
      peakLongTarget: peakTargets.longSessionTarget,
      weekNumber: index + 1,
      totalWeeks,
      isAdaptationWeek,
    });
    const weekInclineCap = buildWeekInclineCap({
      peakInclineTarget: peakTargets.sustainedInclineTarget,
      weekNumber: index + 1,
      totalWeeks,
      isAdaptationWeek,
      maxIncline: inputs.constraints.treadmillMaxInclinePercent,
    });

    const scheduledDays = scheduleWeekDays({
      weekStart,
      weekEnd,
      daysPerWeek: effectiveDaysPerWeek,
      preferredDays: inputs.preferredDays,
      anyDays: inputs.anyDays,
    });

    if (scheduledDays.warning) {
      warnings.push(scheduledDays.warning);
    }

    const days: TrainingDay[] = scheduledDays.days.map((dayDate, position) => {
      const workoutType = workoutsForWeek[position] ?? "Recovery / mobility";
      const isLongSession =
        workoutType === "Outdoor long hike" ||
        (workoutType === "Zone 2 incline walk" && outdoorHikesPerWeek === 0 && position === 0);
      const workout = buildWorkout({
        weekNumber: index + 1,
        workoutType,
        weekVolume,
        fitnessLevel: inputs.fitnessLevel,
        hike: inputs.hike,
        constraints: inputs.constraints,
        longHikeMinutes: lastLongHikeMinutes,
        isTaperWeek: index + 1 === totalWeeks,
        isDeloadWeek: (index + 1) % 4 === 0,
        isAdaptationWeek,
        longSessionMinutes: longSessionTarget,
        inclineCap: weekInclineCap,
        isLongSession,
      });

      if (workout.type === "Outdoor long hike") {
        lastLongHikeMinutes = workout.durationMinutes;
      }

      return {
        date: toIsoDate(dayDate),
        dayName: DAY_NAMES[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1],
        workouts: [workout],
      };
    });

    if (inputs.includeStrength && inputs.strengthOnCardioDays && strengthDaysPerWeek > 0) {
      attachStrengthAddOns(days, {
        count: strengthDaysPerWeek,
        phase: getStrengthPhase(isAdaptationWeek, index + 1, totalWeeks),
        trainingDaysPerWeek: inputs.daysPerWeek,
      });
    }

    const totalMinutes = days.reduce(
      (sum, day) => sum + day.workouts.reduce((daySum, workout) => daySum + workout.durationMinutes, 0),
      0
    );

    let finalWeekNotes = weekNoteText;
    if (index === peakWeekIndex) {
      const peakLongSession = Math.max(
        ...days.flatMap((day) => day.workouts.map((workout) => workout.durationMinutes))
      );
      const meetsLongTarget = peakLongSession >= Math.round(hikeDemands.estimatedHikeDurationMinutes * 0.7);
      const meetsVolumeTarget = totalMinutes >= Math.round(hikeDemands.estimatedHikeDurationMinutes * 1.5);
      const meetsInclineTarget = weekInclineCap >= hikeDemands.averageGradePct * 0.6;
      if (!meetsLongTarget || !meetsVolumeTarget || !meetsInclineTarget) {
        finalWeekNotes = `${finalWeekNotes} This plan does not fully reach hike-specific demands due to limited time or availability.`;
      }
    }

    if (inputs.includeStrength) {
      finalWeekNotes = `${finalWeekNotes} Strength focus: ${getStrengthPhase(
        isAdaptationWeek,
        index + 1,
        totalWeeks
      )}.`;
    }

    return {
      weekNumber: index + 1,
      startDate: toIsoDate(weekStart),
      endDate: toIsoDate(weekEnd),
      totalMinutes,
      notes: finalWeekNotes,
      focus: weekFocus,
      days,
    };
  });

  return {
    totalWeeks,
    warnings,
    summary: {
      daysPerWeek: inputs.daysPerWeek,
      preferredDays: pickedDays,
      averageWeeklyMinutes: Math.round(averageWeeklyMinutes),
    },
    weeks,
  };
}

export function buildWeeklyVolumes(
  baselineMinutes: number,
  totalWeeks: number,
  weeklyTarget: number
): number[] {
  if (totalWeeks <= 1) {
    const initial = baselineMinutes <= 30 ? 45 : Math.max(20, Math.round(baselineMinutes * 0.85));
    return [initial];
  }

  const volumes: number[] = [];
  let lastBuild = baselineMinutes <= 30 ? 45 : Math.max(30, baselineMinutes);
  const peakWeekIndex = Math.max(totalWeeks - 1, 1);

  for (let week = 1; week <= totalWeeks; week += 1) {
    if (week === totalWeeks) {
      const peak = Math.max(...volumes, lastBuild);
      volumes.push(Math.round(peak * 0.55));
      continue;
    }

    if (week % 4 === 0) {
      volumes.push(Math.round(lastBuild * 0.78));
      continue;
    }

    const remainingWeeks = Math.max(peakWeekIndex - week + 1, 1);
    const targetStep = (weeklyTarget - lastBuild) / remainingWeeks;
    const nextBuild = Math.min(lastBuild * 1.07, lastBuild * 1.1, lastBuild + targetStep);
    lastBuild = Math.round(nextBuild);
    volumes.push(lastBuild);
  }

  if (baselineMinutes <= 30) {
    volumes[0] = Math.min(volumes[0], 60);
    if (volumes.length > 1) {
      volumes[1] = Math.min(volumes[1], 75);
    }
  }

  return volumes;
}

function buildWeekWorkouts(input: {
  weekNumber: number;
  totalWeeks: number;
  weekVolume: number;
  daysPerWeek: number;
  treadmillSessionsPerWeek: number;
  outdoorHikesPerWeek: number;
  includeStrength: boolean;
  strengthDaysPerWeek: number;
  strengthOnCardioDays: boolean;
}): WorkoutType[] {
  const workouts: WorkoutType[] = [];
  const dayCount = Math.max(2, input.daysPerWeek);
  const outdoorCount = Math.min(input.outdoorHikesPerWeek, dayCount);
  const treadmillCount = Math.min(input.treadmillSessionsPerWeek, dayCount);
  const strengthCount =
    input.includeStrength && !input.strengthOnCardioDays
      ? Math.min(input.strengthDaysPerWeek, dayCount)
      : 0;

  const isDeloadWeek = input.weekNumber % 4 === 0;
  const isTaperWeek = input.weekNumber === input.totalWeeks;
  const isEarlyWeek = input.weekNumber <= 2;
  const requiresTreadmillLong = outdoorCount === 0 && treadmillCount > 0;

  for (let i = 0; i < outdoorCount; i += 1) {
    workouts.push("Outdoor long hike");
  }

  for (let i = 0; i < treadmillCount; i += 1) {
    if (requiresTreadmillLong && i === 0) {
      workouts.push("Zone 2 incline walk");
      continue;
    }
    if (isDeloadWeek || isTaperWeek || isEarlyWeek) {
      workouts.push("Zone 2 incline walk");
    } else if (i === 0) {
      workouts.push("Treadmill intervals");
    } else {
      workouts.push("Zone 2 incline walk");
    }
  }

  for (let i = 0; i < strengthCount; i += 1) {
    workouts.push("Strength");
  }

  while (workouts.length < dayCount) {
    workouts.push("Recovery / mobility");
  }

  return workouts.slice(0, dayCount);
}

function buildWorkout(input: {
  weekNumber: number;
  workoutType: WorkoutType;
  weekVolume: number;
  fitnessLevel: FitnessLevel;
  hike: TrainingPlanInputs["hike"];
  constraints: TrainingPlanInputs["constraints"];
  longHikeMinutes: number;
  isTaperWeek: boolean;
  isDeloadWeek: boolean;
  isAdaptationWeek: boolean;
  longSessionMinutes: number;
  inclineCap: number;
  isLongSession: boolean;
}): TrainingWorkout {
  const allocations = allocateDurations(input.weekVolume, input.workoutType);
  const duration = input.isAdaptationWeek
    ? clamp(allocations.durationMinutes, 15, 25)
    : allocations.durationMinutes;
  const inclineCap = input.isAdaptationWeek
    ? Math.min(input.constraints.treadmillMaxInclinePercent, 3)
    : input.inclineCap;

  if (input.workoutType === "Treadmill intervals") {
    const plan = generatePlan(input.hike.profilePoints, input.hike.distanceMiles, input.hike.elevationGainFt, {
      fitnessLevel: input.fitnessLevel,
      targetDurationMinutes: clampDuration(duration, input.fitnessLevel),
      packWeightLbs: 0,
      treadmill: {
        minInclinePercent: 0,
        maxInclinePercent: inclineCap,
        maxSpeedMph: input.constraints.maxSpeedMph,
      },
    });

    const intervalSegments = applyIntervalPattern(plan.segments, {
      ...input.constraints,
      treadmillMaxInclinePercent: inclineCap,
    });

    return {
      id: workoutId(input.weekNumber, input.workoutType),
      type: input.workoutType,
      durationMinutes: plan.totalMinutes,
      notes:
        input.isDeloadWeek || input.isTaperWeek
          ? "Shorter intervals, keep effort smooth."
          : "Incline intervals based on hike profile.",
      segments: toTrainingSegments(intervalSegments),
    };
  }

  if (input.workoutType === "Zone 2 incline walk") {
    const inclineTarget = clampAverageGrade(input.hike.profilePoints, 2, inclineCap);
    const targetMinutes = input.isLongSession
      ? Math.max(duration, input.longSessionMinutes)
      : Math.round(duration * 0.9);
    const plan = generatePlan(input.hike.profilePoints, input.hike.distanceMiles, input.hike.elevationGainFt, {
      fitnessLevel: input.fitnessLevel,
      targetDurationMinutes: clampDuration(targetMinutes, input.fitnessLevel),
      packWeightLbs: 0,
      treadmill: {
        minInclinePercent: 0,
        maxInclinePercent: inclineCap,
        maxSpeedMph: input.constraints.maxSpeedMph,
      },
    });

    const steadySegments = smoothSegmentInclines(plan.segments, 5);

    return {
      id: workoutId(input.weekNumber, input.workoutType),
      type: input.workoutType,
      durationMinutes: plan.totalMinutes,
      inclineTarget,
      notes: "Steady state, nose-breathing effort.",
      segments: toTrainingSegments(steadySegments),
    };
  }

  if (input.workoutType === "Strength") {
    return {
      id: workoutId(input.weekNumber, input.workoutType),
      type: input.workoutType,
      durationMinutes: 25,
      notes: "Bodyweight squats, lunges, step-ups, core.",
    };
  }

  if (input.workoutType === "Outdoor long hike") {
    const target = Math.max(input.longSessionMinutes, input.longHikeMinutes);
    const capped = Math.min(target, input.longHikeMinutes + 20);
    return {
      id: workoutId(input.weekNumber, input.workoutType),
      type: input.workoutType,
      durationMinutes: capped,
      notes: `Focus on time-on-feet with ${Math.round(input.hike.elevationGainFt * 0.3)} ft of climbing.`,
    };
  }

  return {
    id: workoutId(input.weekNumber, input.workoutType),
    type: input.workoutType,
    durationMinutes: 20,
    notes: "Easy mobility, light stretching.",
  };
}

function allocateDurations(weekVolume: number, workoutType: WorkoutType) {
  const weightMap: Record<WorkoutType, number> = {
    "Outdoor long hike": 0.35,
    "Treadmill intervals": 0.25,
    "Zone 2 incline walk": 0.25,
    Strength: 0.15,
    "Recovery / mobility": 0.1,
  };

  const duration = Math.max(20, Math.round(weekVolume * weightMap[workoutType]));
  return { durationMinutes: duration };
}

function clampDuration(duration: number, fitnessLevel: FitnessLevel) {
  const maxByLevel = {
    Beginner: 60,
    Intermediate: 75,
    Advanced: 90,
  }[fitnessLevel];

  return Math.min(Math.max(25, duration), maxByLevel);
}

function clampAverageGrade(points: ProfilePoint[], min: number, max: number) {
  if (points.length < 2) {
    return min;
  }
  let totalGrade = 0;
  let count = 0;
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i].elevationFt - points[i - 1].elevationFt;
    const distance = Math.max(points[i].distanceMiles - points[i - 1].distanceMiles, 0.01);
    totalGrade += (delta / (distance * 5280)) * 100;
    count += 1;
  }
  const average = totalGrade / Math.max(count, 1);
  return Math.min(Math.max(average, min), max);
}

function pickTrainingDays(daysPerWeek: number, preferredDays: number[], anyDays: boolean) {
  const ordered = [0, 2, 4, 5, 1, 3, 6];
  const safePreferred = preferredDays.filter((day) => day >= 0 && day <= 6);
  const selection: number[] = [];

  if (!anyDays && safePreferred.length) {
    for (const day of safePreferred) {
      if (!selection.includes(day)) {
        selection.push(day);
      }
      if (selection.length >= daysPerWeek) {
        break;
      }
    }
  }

  for (const day of ordered) {
    if (selection.length >= daysPerWeek) {
      break;
    }
    if (!selection.includes(day)) {
      selection.push(day);
    }
  }

  return selection.slice(0, daysPerWeek);
}

function weekNotes(isAdaptation: boolean, weekNumber: number, totalWeeks: number) {
  if (isAdaptation && weekNumber <= 2) {
    return "Adaptation week: focus on consistency and easy effort.";
  }
  if (weekNumber === totalWeeks) {
    return "Taper week: reduce volume, keep a little intensity.";
  }
  if (weekNumber % 4 === 0) {
    return "Deload week: reduce volume and focus on recovery.";
  }
  return "Build week: small volume increase.";
}

function weekFocusLine(isAdaptation: boolean, weekNumber: number, totalWeeks: number) {
  if (isAdaptation && weekNumber <= 2) {
    return "Adaptation: building consistency";
  }
  if (weekNumber === totalWeeks) {
    return "Taper: reduce volume, stay sharp";
  }
  if (weekNumber % 4 === 0) {
    return "Deload: emphasize recovery";
  }
  if (weekNumber === totalWeeks - 1) {
    return "Peak: hike-specific endurance";
  }
  return "Build: increasing time-on-feet";
}

function getStrengthPhase(isAdaptation: boolean, weekNumber: number, totalWeeks: number) {
  if (weekNumber === totalWeeks) {
    return "light mobility for recovery";
  }
  if (isAdaptation && weekNumber <= 2) {
    return "movement prep & injury prevention";
  }
  if (weekNumber === totalWeeks - 1) {
    return "maintenance strength";
  }
  return "leg strength + core";
}


function deriveHikeDemands(hike: TrainingPlanInputs["hike"], fitnessLevel: FitnessLevel) {
  // Estimate duration using simple hike pace + elevation penalty (hours -> minutes).
  const estimatedHikeDurationMinutes = Math.round(
    (hike.distanceMiles / 3 + (hike.elevationGainFt / 1000) * 0.5) * 60
  );
  const { averageGradePct, maxSustainedGradePct } = computeGradeStats(hike.profilePoints);
  return {
    estimatedHikeDurationMinutes,
    totalElevationGainFt: hike.elevationGainFt,
    averageGradePct,
    maxSustainedGradePct,
  };
}

function buildPeakTargets(
  demands: ReturnType<typeof deriveHikeDemands>,
  totalWeeks: number
) {
  const durationFactor = totalWeeks >= 8 ? 0.85 : totalWeeks >= 4 ? 0.78 : 0.7;
  const longSessionTarget = Math.round(demands.estimatedHikeDurationMinutes * durationFactor);
  const sustainedInclineTarget = clamp(
    demands.averageGradePct * (totalWeeks >= 8 ? 0.8 : 0.7),
    2,
    12
  );
  const volumeMultiplier = totalWeeks >= 8 ? 1.8 : 1.5;
  const weeklyVolumeTarget = Math.round(demands.estimatedHikeDurationMinutes * volumeMultiplier);

  return {
    longSessionTarget,
    sustainedInclineTarget,
    weeklyVolumeTarget,
  };
}

function buildLongSessionTarget(input: {
  baselineMinutes: number;
  peakLongTarget: number;
  weekNumber: number;
  totalWeeks: number;
  isAdaptationWeek: boolean;
}) {
  if (input.isAdaptationWeek) {
    return clamp(input.peakLongTarget * 0.25, 15, 30);
  }
  const peakWeek = Math.max(input.totalWeeks - 1, 1);
  const progress = Math.min(input.weekNumber / peakWeek, 1);
  const baselineLong = Math.max(20, input.baselineMinutes * 0.4);
  return Math.round(baselineLong + (input.peakLongTarget - baselineLong) * progress);
}

function buildWeekInclineCap(input: {
  peakInclineTarget: number;
  weekNumber: number;
  totalWeeks: number;
  isAdaptationWeek: boolean;
  maxIncline: number;
}) {
  if (input.isAdaptationWeek) {
    return Math.min(input.maxIncline, 3);
  }
  const peakWeek = Math.max(input.totalWeeks - 1, 1);
  const progress = Math.min(input.weekNumber / peakWeek, 1);
  const base = 3;
  const target = base + (input.peakInclineTarget - base) * progress;
  return Math.min(input.maxIncline, Math.max(base, target));
}

function computeGradeStats(points: ProfilePoint[]) {
  if (points.length < 2) {
    return { averageGradePct: 0, maxSustainedGradePct: 0 };
  }
  const grades: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i].elevationFt - points[i - 1].elevationFt;
    const distance = Math.max(points[i].distanceMiles - points[i - 1].distanceMiles, 0.01);
    grades.push((delta / (distance * 5280)) * 100);
  }
  const averageGradePct = grades.reduce((sum, value) => sum + value, 0) / grades.length;
  const window = 3;
  let maxSustainedGradePct = averageGradePct;
  for (let i = 0; i < grades.length; i += 1) {
    const slice = grades.slice(i, i + window);
    if (slice.length === 0) continue;
    const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    maxSustainedGradePct = Math.max(maxSustainedGradePct, avg);
  }
  return { averageGradePct, maxSustainedGradePct };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function toStartOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day);
}

type ScheduledWeek = {
  days: Date[];
  warning?: string;
};

function scheduleWeekDays(input: {
  weekStart: Date;
  weekEnd: Date;
  daysPerWeek: number;
  preferredDays: number[];
  anyDays: boolean;
}): ScheduledWeek {
  const days: Date[] = [];
  const preferred = input.preferredDays.filter((day) => day >= 0 && day <= 6);
  const weekDates = buildWeekDates(input.weekStart, input.weekEnd);

  if (input.anyDays || preferred.length === 0) {
    const step = Math.max(1, Math.floor(weekDates.length / input.daysPerWeek));
    for (let i = 0; i < input.daysPerWeek; i += 1) {
      const idx = Math.min(i * step, weekDates.length - 1);
      days.push(weekDates[idx]);
    }
    return { days: dedupeDates(days) };
  }

  for (const date of weekDates) {
    const weekday = (date.getDay() + 6) % 7;
    if (preferred.includes(weekday)) {
      days.push(date);
    }
    if (days.length >= input.daysPerWeek) break;
  }

  if (days.length < input.daysPerWeek) {
    const warning = "Not enough preferred days this week; some sessions may be skipped.";
    return { days, warning };
  }

  return { days };
}

function buildWeekDates(start: Date, end: Date) {
  const dates: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function dedupeDates(dates: Date[]) {
  const seen = new Set<string>();
  return dates.filter((date) => {
    const key = toIsoDate(date);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attachStrengthAddOns(
  days: TrainingDay[],
  input: { count: number; phase: string; trainingDaysPerWeek: number }
) {
  let remaining = input.count;
  const cardioDays = days.filter((day) =>
    day.workouts.some(
      (workout) => workout.type === "Outdoor long hike" || workout.type.includes("Treadmill")
    )
  );

  if (input.trainingDaysPerWeek <= 2) {
    remaining = Math.min(2, cardioDays.length);
  } else {
    remaining = Math.min(remaining, 2, cardioDays.length);
  }

  for (const day of cardioDays) {
    if (remaining <= 0) break;
    day.workouts.push({
      id: `${day.date}-strength-addon`,
      type: "Strength",
      durationMinutes: strengthDurationForPhase(input.phase),
      notes: strengthNotesForPhase(input.phase),
    });
    remaining -= 1;
  }
}

function strengthDurationForPhase(phase: string) {
  if (phase.includes("mobility")) return 15;
  if (phase.includes("maintenance")) return 18;
  if (phase.includes("leg strength")) return 28;
  if (phase.includes("recovery")) return 15;
  return 20;
}

function strengthNotesForPhase(phase: string) {
  if (phase.includes("mobility")) return "Movement prep & injury prevention.";
  if (phase.includes("maintenance")) return "Maintain strength, avoid fatigue.";
  if (phase.includes("recovery")) return "Strength reduced for recovery.";
  return "Strength to support climbing endurance.";
}

export function getNextMonday(from: Date) {
  const start = toStartOfDay(from);
  const day = start.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  return addDays(start, daysUntilMonday);
}

export function getMinPrepWeeks(distanceMiles: number, elevationGainFt: number) {
  if (distanceMiles <= 5 && elevationGainFt <= 1000) {
    return 4;
  }
  if (distanceMiles <= 8 || elevationGainFt <= 3000) {
    return 6;
  }
  if (distanceMiles >= 12 || elevationGainFt >= 4500) {
    return 12;
  }
  return 8;
}

function enforceSessionInvariant(input: {
  daysPerWeek: number;
  treadmillSessionsPerWeek: number;
  outdoorHikesPerWeek: number;
  strengthDaysPerWeek: number;
  includeStrength: boolean;
  strengthOnCardioDays: boolean;
}) {
  let treadmill = Math.max(input.treadmillSessionsPerWeek, 0);
  let outdoor = Math.max(input.outdoorHikesPerWeek, 0);
  const strengthAddOns = input.includeStrength ? Math.max(input.strengthDaysPerWeek, 0) : 0;
  let strength =
    input.includeStrength && !input.strengthOnCardioDays ? strengthAddOns : 0;
  const maxSessions = Math.max(input.daysPerWeek, 0);
  const total = treadmill + outdoor + strength;
  if (total <= maxSessions) {
    return {
      treadmillSessionsPerWeek: treadmill,
      outdoorHikesPerWeek: outdoor,
      strengthDaysPerWeek: strengthAddOns,
    };
  }
  let overage = total - maxSessions;
  if (strength > 0) {
    const reduction = Math.min(strength, overage);
    strength -= reduction;
    overage -= reduction;
  }
  if (outdoor > 0 && overage > 0) {
    const reduction = Math.min(outdoor, overage);
    outdoor -= reduction;
    overage -= reduction;
  }
  if (overage > 0) {
    treadmill = Math.max(treadmill - overage, 0);
  }
  return {
    treadmillSessionsPerWeek: treadmill,
    outdoorHikesPerWeek: outdoor,
    strengthDaysPerWeek: input.strengthOnCardioDays ? strengthAddOns : strength,
  };
}

function workoutId(weekNumber: number, type: WorkoutType) {
  return `${weekNumber}-${type.replace(/\s+/g, "-").toLowerCase()}`;
}

function toTrainingSegments(segments: PlanSegment[]): TrainingSegment[] {
  return segments.map((segment) => ({
    index: segment.segment,
    minutes: segment.minutes,
    inclinePct: Number(segment.inclinePercent.toFixed(1)),
    speedMph: Number(segment.speedMph.toFixed(1)),
    note: segment.notes || undefined,
  }));
}

function smoothSegmentInclines(segments: PlanSegment[], windowSize: number): PlanSegment[] {
  if (segments.length === 0) return segments;
  const smoothed = segments.map((segment) => ({ ...segment }));
  const grades = segments.map((segment) => segment.inclinePercent);

  smoothed.forEach((segment, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(grades.length, index + Math.ceil(windowSize / 2));
    const window = grades.slice(start, end);
    const avg = window.reduce((sum, value) => sum + value, 0) / window.length;
    segment.inclinePercent = Number(avg.toFixed(1));
  });

  return smoothed;
}

function applyIntervalPattern(
  segments: PlanSegment[],
  constraints: TrainingPlanInputs["constraints"]
): PlanSegment[] {
  if (segments.length <= 2) return segments;

  return segments.map((segment, index) => {
    if (segment.segment === 0 || segment.notes?.includes("Cool-down")) {
      return segment;
    }

    const isHard = index % 2 === 1;
    const factor = isHard ? 1.15 : 0.85;
    const adjustedIncline = clamp(
      roundToStep(
        clamp(segment.inclinePercent * factor, 0, constraints.treadmillMaxInclinePercent),
        0.5
      ),
      0,
      constraints.treadmillMaxInclinePercent
    );
    const adjustedSpeed = clamp(
      roundToStep(
        clamp(segment.speedMph * (isHard ? 0.92 : 1.05), 1.8, constraints.maxSpeedMph),
        0.1
      ),
      0,
      constraints.maxSpeedMph
    );

    return {
      ...segment,
      inclinePercent: adjustedIncline,
      speedMph: adjustedSpeed,
      notes: segment.notes || (isHard ? "Hard interval" : "Recovery"),
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
