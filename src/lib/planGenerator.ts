import { roundToStep } from "@/lib/formatters";

export type ProfilePoint = {
  distanceMiles: number;
  elevationFt: number;
};

export type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";

export type TreadmillConstraints = {
  minInclinePercent: number;
  maxInclinePercent: number;
  maxSpeedMph: number;
};

export type PlanSettings = {
  fitnessLevel: FitnessLevel;
  targetDurationMinutes: number | "auto";
  packWeightLbs: number;
  treadmill: TreadmillConstraints;
};

export type PlanSegment = {
  segment: number;
  minutes: number;
  inclinePercent: number;
  speedMph: number;
  notes: string;
};

const FITNESS_SPEEDS: Record<FitnessLevel, { min: number; max: number }> = {
  Beginner: { min: 2.0, max: 3.2 },
  Intermediate: { min: 2.8, max: 4.2 },
  Advanced: { min: 3.2, max: 5.0 },
};

type SegmentDraft = {
  distanceMiles: number;
  elevationDeltaFt: number;
  gradePercent: number;
};

export function generatePlan(
  profilePoints: ProfilePoint[],
  distanceMiles: number,
  elevationGainFt: number,
  settings: PlanSettings
): { totalMinutes: number; segments: PlanSegment[] } {
  const baseDuration =
    settings.targetDurationMinutes === "auto"
      ? estimateDurationMinutes(distanceMiles, elevationGainFt, settings.fitnessLevel)
      : settings.targetDurationMinutes;

  const totalMinutes = Math.max(baseDuration, 20);
  const mainDuration = Math.max(totalMinutes - 10, 5);

  const baseSegments = buildSegments(profilePoints);
  const normalizedSegments = normalizeSegmentCount(baseSegments);
  const smoothedGrades = smoothGrades(normalizedSegments.map((s) => s.gradePercent));

  const effortScores = normalizedSegments.map((segment) => {
    const distanceWeight = segment.distanceMiles;
    const elevationWeight = Math.max(segment.elevationDeltaFt, 0) / 1000 * 1.4;
    return distanceWeight + elevationWeight;
  });

  const totalEffort = effortScores.reduce((sum, value) => sum + value, 0) || 1;
  const segments: PlanSegment[] = [];

  const packNote =
    settings.packWeightLbs > 0 ? `Pack weight ${settings.packWeightLbs} lbs` : "";

  let accumulatedMinutes = 0;

  for (let i = 0; i < normalizedSegments.length; i += 1) {
    const portion = effortScores[i] / totalEffort;
    const rawMinutes =
      i === normalizedSegments.length - 1
        ? mainDuration - accumulatedMinutes
        : mainDuration * portion;
    const minutes = roundToStep(rawMinutes, 0.5);

    accumulatedMinutes += minutes;

    const incline = clamp(
      smoothedGrades[i],
      settings.treadmill.minInclinePercent,
      settings.treadmill.maxInclinePercent
    );
    const speed = computeSpeed(
      incline,
      settings.fitnessLevel,
      settings.treadmill.maxSpeedMph,
      settings.packWeightLbs
    );

    const roundedIncline = clamp(
      roundToStep(incline, 0.5),
      settings.treadmill.minInclinePercent,
      settings.treadmill.maxInclinePercent
    );
    const roundedSpeed = clamp(roundToStep(speed, 0.1), 0, settings.treadmill.maxSpeedMph);
    segments.push({
      segment: i + 1,
      minutes: roundToStep(minutes, 0.5),
      inclinePercent: roundedIncline,
      speedMph: roundedSpeed,
      notes: packNote,
    });
  }

  const warmUpSpeed = warmUpSpeedFor(settings.fitnessLevel);
  const coolDownSpeed = Math.max(warmUpSpeed - 0.2, FITNESS_SPEEDS[settings.fitnessLevel].min);

  const warmUpIncline = clamp(
    roundToStep(
      clamp(1, settings.treadmill.minInclinePercent, settings.treadmill.maxInclinePercent),
      0.5
    ),
    settings.treadmill.minInclinePercent,
    settings.treadmill.maxInclinePercent
  );
  const warmUpSpeedRounded = clamp(
    roundToStep(clamp(warmUpSpeed, 1.8, settings.treadmill.maxSpeedMph), 0.1),
    0,
    settings.treadmill.maxSpeedMph
  );
  const warmUp: PlanSegment = {
    segment: 0,
    minutes: 5,
    inclinePercent: warmUpIncline,
    speedMph: warmUpSpeedRounded,
    notes: "Warm-up",
  };

  const coolDownIncline = clamp(
    roundToStep(
      clamp(0.5, settings.treadmill.minInclinePercent, settings.treadmill.maxInclinePercent),
      0.5
    ),
    settings.treadmill.minInclinePercent,
    settings.treadmill.maxInclinePercent
  );
  const coolDownSpeedRounded = clamp(
    roundToStep(clamp(coolDownSpeed, 1.6, settings.treadmill.maxSpeedMph), 0.1),
    0,
    settings.treadmill.maxSpeedMph
  );
  const coolDown: PlanSegment = {
    segment: segments.length + 1,
    minutes: 5,
    inclinePercent: coolDownIncline,
    speedMph: coolDownSpeedRounded,
    notes: "Cool-down",
  };

  return {
    totalMinutes,
    segments: [warmUp, ...segments, coolDown],
  };
}

export function estimateDurationMinutes(
  distanceMiles: number,
  elevationGainFt: number,
  fitnessLevel: FitnessLevel
): number {
  const baseSpeed = {
    Beginner: 2.4,
    Intermediate: 3.2,
    Advanced: 4.0,
  }[fitnessLevel];
  const flatMinutes = (distanceMiles / baseSpeed) * 60;
  const elevationPenalty = (elevationGainFt / 1000) * {
    Beginner: 12,
    Intermediate: 9,
    Advanced: 7,
  }[fitnessLevel];
  return Math.round(flatMinutes + elevationPenalty);
}

function buildSegments(points: ProfilePoint[]): SegmentDraft[] {
  if (points.length < 2) {
    return [];
  }

  const segments: SegmentDraft[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[i - 1];
    const distance = Math.max(current.distanceMiles - previous.distanceMiles, 0.01);
    const elevationDelta = current.elevationFt - previous.elevationFt;
    const grade = (elevationDelta / (distance * 5280)) * 100;

    segments.push({
      distanceMiles: distance,
      elevationDeltaFt: elevationDelta,
      gradePercent: grade,
    });
  }

  return segments;
}

function normalizeSegmentCount(segments: SegmentDraft[]): SegmentDraft[] {
  if (segments.length === 0) {
    return [];
  }

  let normalized = [...segments];

  while (normalized.length < 10) {
    const expanded: SegmentDraft[] = [];
    for (const segment of normalized) {
      const halfDistance = segment.distanceMiles / 2;
      const halfElevation = segment.elevationDeltaFt / 2;
      expanded.push(
        {
          distanceMiles: halfDistance,
          elevationDeltaFt: halfElevation,
          gradePercent: segment.gradePercent,
        },
        {
          distanceMiles: halfDistance,
          elevationDeltaFt: halfElevation,
          gradePercent: segment.gradePercent,
        }
      );
    }
    normalized = expanded;
  }

  while (normalized.length > 30) {
    const grouped: SegmentDraft[] = [];
    const groupSize = Math.ceil(normalized.length / 30);
    for (let i = 0; i < normalized.length; i += groupSize) {
      const group = normalized.slice(i, i + groupSize);
      const distance = group.reduce((sum, seg) => sum + seg.distanceMiles, 0);
      const elevation = group.reduce((sum, seg) => sum + seg.elevationDeltaFt, 0);
      const grade = distance === 0 ? 0 : (elevation / (distance * 5280)) * 100;
      grouped.push({
        distanceMiles: distance,
        elevationDeltaFt: elevation,
        gradePercent: grade,
      });
    }
    normalized = grouped;
  }

  return normalized;
}

function smoothGrades(grades: number[]): number[] {
  if (grades.length === 0) {
    return [];
  }

  return grades.map((_, index) => {
    const window = grades.slice(Math.max(0, index - 1), Math.min(grades.length, index + 2));
    const total = window.reduce((sum, value) => sum + value, 0);
    return total / window.length;
  });
}

function computeSpeed(
  incline: number,
  fitnessLevel: FitnessLevel,
  maxSpeed: number,
  packWeightLbs: number
): number {
  const { min, max } = FITNESS_SPEEDS[fitnessLevel];
  const range = max - min;
  const gradePenalty = Math.max(incline, 0) * 0.08;
  const downhillBoost = incline < 0 ? Math.min(Math.abs(incline) * 0.03, range * 0.3) : 0;
  let speed = max - gradePenalty + downhillBoost;

  if (packWeightLbs > 0) {
    speed -= packWeightLbs * 0.01;
  }

  speed = clamp(speed, min, Math.min(maxSpeed, max));
  return speed;
}

function warmUpSpeedFor(fitnessLevel: FitnessLevel): number {
  return {
    Beginner: 2.0,
    Intermediate: 2.6,
    Advanced: 3.0,
  }[fitnessLevel];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
