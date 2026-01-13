import { describe, expect, it } from "vitest";
import {
  buildTrainingPlan,
  buildWeeklyVolumes,
  getMinPrepWeeks,
  getNextMonday,
} from "./buildTrainingPlan";

const sampleInputs = {
  hike: {
    distanceMiles: 5,
    elevationGainFt: 1500,
    profilePoints: [
      { distanceMiles: 0, elevationFt: 1000 },
      { distanceMiles: 2.5, elevationFt: 1600 },
      { distanceMiles: 5, elevationFt: 2500 },
    ],
  },
  fitnessLevel: "Intermediate" as const,
  targetDate: "2025-08-02",
  trainingStartDate: "2025-06-07",
  daysPerWeek: 3,
  preferredDays: [1, 3, 5],
  anyDays: false,
  baselineMinutes: 180,
  constraints: {
    treadmillMaxInclinePercent: 12,
    treadmillSessionsPerWeek: 1,
    outdoorHikesPerWeek: 1,
    maxSpeedMph: 4.5,
  },
  strengthSessionsPerWeek: 0,
  includeStrength: true,
  strengthOnCardioDays: true,
  fillActiveRecoveryDays: true,
};

describe("buildTrainingPlan", () => {
  it("calculates week count from dates", () => {
    const plan = buildTrainingPlan(sampleInputs);
    expect(plan.totalWeeks).toBeGreaterThan(0);
  });

  it("places deload every 4th week", () => {
    const volumes = buildWeeklyVolumes(180, 6, 300);
    expect(volumes[3]).toBeLessThan(volumes[2]);
  });

  it("reduces volume on the final taper week", () => {
    const volumes = buildWeeklyVolumes(180, 5, 300);
    const last = volumes[volumes.length - 1];
    const peak = Math.max(...volumes.slice(0, -1));
    expect(last).toBeLessThan(peak);
  });

  it("keeps build week increases under 10%", () => {
    const volumes = buildWeeklyVolumes(200, 6, 320);
    for (let i = 1; i < volumes.length - 1; i += 1) {
      if ((i + 1) % 4 === 0) continue;
      if (i % 4 === 0) continue;
      const increase = volumes[i] / volumes[i - 1];
      expect(increase).toBeLessThanOrEqual(1.1);
      expect(increase).toBeGreaterThanOrEqual(1.05);
    }
  });

  it("caps treadmill duration for beginners", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      fitnessLevel: "Beginner",
      baselineMinutes: 400,
    });
    const treadmill = plan.weeks[0].days
      .flatMap((day) => day.workouts)
      .find((workout) => workout.type.includes("Treadmill"));
    expect(treadmill?.durationMinutes ?? 0).toBeLessThanOrEqual(60);
  });

  it("includes segments for treadmill workouts within constraints", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      constraints: {
        treadmillMaxInclinePercent: 8,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4,
      },
    });
    const treadmillWorkouts = plan.weeks
      .flatMap((week) => week.days)
      .flatMap((day) => day.workouts)
      .filter((workout) => workout.type.includes("Treadmill") || workout.type.includes("Zone 2"));

    expect(treadmillWorkouts.length).toBeGreaterThan(0);
    for (const workout of treadmillWorkouts) {
      expect(workout.segments?.length ?? 0).toBeGreaterThan(0);
      const totalMinutes = workout.segments?.reduce((sum, segment) => sum + segment.minutes, 0) ?? 0;
      expect(Math.abs(totalMinutes - workout.durationMinutes)).toBeLessThanOrEqual(1);
      const maxIncline = Math.max(...(workout.segments ?? []).map((segment) => segment.inclinePct));
      const maxSpeed = Math.max(...(workout.segments ?? []).map((segment) => segment.speedMph));
      expect(maxIncline).toBeLessThanOrEqual(8);
      expect(maxSpeed).toBeLessThanOrEqual(4);
      const inclineSteps = (workout.segments ?? []).every(
        (segment) => Number.isInteger(Math.round(segment.inclinePct * 2))
      );
      expect(inclineSteps).toBe(true);
    }
  });

  it("uses rolling week ranges from training start date", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      trainingStartDate: "2026-01-09",
      targetDate: "2026-01-16",
    });
    expect(plan.weeks[0].startDate).toBe("2026-01-09");
    expect(plan.weeks[0].endDate).toBe("2026-01-15");
    expect(plan.weeks[1].startDate).toBe("2026-01-16");
  });

  it("picks next Monday from today", () => {
    const monday = getNextMonday(new Date("2026-01-09"));
    expect(monday.toISOString().slice(0, 10)).toBe("2026-01-12");
  });

  it("generates a plan for baseline zero with safe week one volume", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      baselineMinutes: 0,
      daysPerWeek: 5,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 4,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4,
      },
    });

    expect(plan.weeks.length).toBeGreaterThan(0);
    expect(plan.weeks[0].totalMinutes).toBeLessThanOrEqual(90);
  });

  it("keeps week one treadmill inclines low for beginners", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      baselineMinutes: 0,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4,
      },
    });
    const treadmillSegments =
      plan.weeks[0].days.flatMap((day) => day.workouts).flatMap((workout) => workout.segments ?? []);
    const avgIncline =
      treadmillSegments.reduce((sum, segment) => sum + segment.inclinePct, 0) /
      Math.max(treadmillSegments.length, 1);
    expect(avgIncline).toBeLessThanOrEqual(6);
  });

  it("reduces sessions when treadmill + outdoor exceed days", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 3,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 3,
        outdoorHikesPerWeek: 2,
        maxSpeedMph: 4,
      },
    });
    const week1Workouts = plan.weeks[0].days.flatMap((day) => day.workouts);
    const treadmillCount = week1Workouts.filter((workout) =>
      workout.type.includes("Treadmill")
    ).length;
    const outdoorCount = week1Workouts.filter((workout) => workout.type === "Outdoor long hike").length;
    expect(treadmillCount + outdoorCount).toBeLessThanOrEqual(3);
  });

  it("warns when preparation weeks are below minimum", () => {
    expect(getMinPrepWeeks(10, 4000)).toBe(8);
    expect(getMinPrepWeeks(12, 5000)).toBe(12);
  });

  it("matches requested cardio counts per week", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 4,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 1,
        maxSpeedMph: 4,
      },
      strengthSessionsPerWeek: 0,
      includeStrength: false,
    });
    const week1 = plan.weeks[0].days.flatMap((day) => day.workouts);
    const treadmillCount = week1.filter((workout) => workout.type.includes("Treadmill") || workout.type.includes("Zone 2")).length;
    const outdoorCount = week1.filter((workout) => workout.type === "Outdoor long hike").length;
    expect(treadmillCount).toBe(2);
    expect(outdoorCount).toBe(1);
  });

  it("keeps remaining days as rest days when sessions do not fill the week", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 3,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4,
      },
      strengthSessionsPerWeek: 0,
      includeStrength: false,
      fillActiveRecoveryDays: false,
    });
    const week1 = plan.weeks[0].days.flatMap((day) => day.workouts);
    const cardioCount = week1.filter(
      (workout) =>
        workout.type.includes("Treadmill") ||
        workout.type.includes("Zone 2") ||
        workout.type === "Outdoor long hike"
    ).length;
    const restCount = week1.filter((workout) => workout.type === "Rest day").length;
    expect(cardioCount).toBe(2);
    expect(restCount).toBe(1);
  });

  it("stacks strength on cardio days when enabled", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 3,
      includeStrength: true,
      strengthOnCardioDays: true,
      strengthSessionsPerWeek: 2,
      anyDays: true,
    });
    const week1Days = plan.weeks[0].days;
    const strengthAddOns = week1Days.filter((day) =>
      day.workouts.some((workout) => workout.type === "Strength")
    ).length;
    expect(strengthAddOns).toBeGreaterThan(0);
    expect(week1Days.length).toBe(3);
    const stackedDay = week1Days.find(
      (day) =>
        day.workouts.some((workout) => workout.type === "Strength") &&
        day.workouts.some((workout) => workout.type !== "Strength")
    );
    if (stackedDay) {
      expect(stackedDay.workouts[0].type).toBe("Strength");
    }
  });

  it("separates strength days when scheduled on their own", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 5,
      includeStrength: true,
      strengthOnCardioDays: false,
      strengthSessionsPerWeek: 2,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 1,
        maxSpeedMph: 4,
      },
      anyDays: true,
    });
    const week1Days = plan.weeks[0].days;
    const strengthIndexes = week1Days
      .map((day, index) => (day.workouts.some((workout) => workout.type === "Strength") ? index : -1))
      .filter((index) => index >= 0);
    if (strengthIndexes.length >= 2) {
      const gap = Math.abs(strengthIndexes[1] - strengthIndexes[0]);
      expect(gap).toBeGreaterThan(1);
    }
  });

  it("labels adaptation weeks for beginner baseline", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      baselineMinutes: 0,
    });
    expect(plan.weeks[0].notes).toMatch(/Adaptation week/i);
  });

  it("hits peak-week long session target range", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      trainingStartDate: "2025-06-07",
      targetDate: "2025-09-13",
      baselineMinutes: 120,
    });
    const peakWeek = plan.weeks[plan.weeks.length - 2];
    const peakLongSession = Math.max(
      ...peakWeek.days.flatMap((day) => day.workouts.map((workout) => workout.durationMinutes))
    );
    const expectedMinutes = Math.round((sampleInputs.hike.distanceMiles / 3 + (sampleInputs.hike.elevationGainFt / 1000) * 0.5) * 60);
    expect(peakLongSession).toBeGreaterThanOrEqual(Math.round(expectedMinutes * 0.7));
    expect(peakLongSession).toBeLessThanOrEqual(Math.round(expectedMinutes * 0.9));
  });

  it("ramps peak-week incline toward hike demand", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      trainingStartDate: "2025-06-07",
      targetDate: "2025-09-13",
      baselineMinutes: 180,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4.5,
      },
    });
    const preEventWeek = plan.weeks[Math.max(plan.weeks.length - 3, 0)];
    const treadmillSegments = preEventWeek.days
      .flatMap((day) => day.workouts)
      .flatMap((workout) => workout.segments ?? []);
    if (treadmillSegments.length === 0) return;
    const avgGrade =
      ((1600 - 1000) / ((2.5 - 0) * 5280) +
        (2500 - 1600) / ((5 - 2.5) * 5280)) /
      2 *
      100;
    const maxIncline = Math.max(...treadmillSegments.map((segment) => segment.inclinePct));
    expect(maxIncline).toBeGreaterThanOrEqual(avgGrade * 0.6);
  });

  it("schedules strength on separate days when configured", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 4,
      includeStrength: true,
      strengthOnCardioDays: false,
      strengthSessionsPerWeek: 2,
      anyDays: true,
    });
    const week1Days = plan.weeks[0].days;
    const strengthDays = week1Days.filter((day) =>
      day.workouts.some((workout) => workout.type === "Strength")
    ).length;
    expect(strengthDays).toBeGreaterThanOrEqual(2);
  });

  it("increases weekly minutes when strength is enabled", () => {
    const withoutStrength = buildTrainingPlan({
      ...sampleInputs,
      includeStrength: false,
      strengthSessionsPerWeek: 0,
      strengthOnCardioDays: true,
    });
    const withStrength = buildTrainingPlan({
      ...sampleInputs,
      includeStrength: true,
      strengthSessionsPerWeek: 2,
      strengthOnCardioDays: true,
    });
    expect(withStrength.weeks[0].totalMinutes).toBeGreaterThan(
      withoutStrength.weeks[0].totalMinutes
    );
  });

  it("reduces strength in taper week", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      includeStrength: true,
      strengthSessionsPerWeek: 2,
      strengthOnCardioDays: true,
    });
    const taperWeek = plan.weeks[plan.weeks.length - 1];
    const taperStrength = taperWeek.days
      .flatMap((day) => day.workouts)
      .filter((workout) => workout.type === "Strength");
    if (taperStrength.length > 0) {
      expect(taperStrength[0].durationMinutes).toBeLessThanOrEqual(18);
    }
  });

  it("adds adequacy note when peak week targets are not met", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      trainingStartDate: "2026-01-09",
      targetDate: "2026-01-16",
      daysPerWeek: 2,
      constraints: {
        treadmillMaxInclinePercent: 6,
        treadmillSessionsPerWeek: 1,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 3,
      },
      strengthSessionsPerWeek: 0,
    });
    const peakWeek = plan.weeks[Math.max(plan.weeks.length - 2, 0)];
    expect(peakWeek.notes).toContain("does not fully reach hike-specific demands");
  });

  it("converts late-stage cardio into long outdoor hikes", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      trainingStartDate: "2025-06-01",
      targetDate: "2025-06-22",
      daysPerWeek: 4,
      includeStrength: true,
      strengthOnCardioDays: false,
      strengthSessionsPerWeek: 2,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 2,
        outdoorHikesPerWeek: 0,
        maxSpeedMph: 4,
      },
      anyDays: true,
    });
    const lateWeeks = plan.weeks.slice(-2);
    const lateCardio = lateWeeks
      .flatMap((week) => week.days)
      .flatMap((day) => day.workouts)
      .filter((workout) => workout.type !== "Strength" && workout.type !== "Rest day");
    const lateStrength = lateWeeks
      .flatMap((week) => week.days)
      .flatMap((day) => day.workouts)
      .filter((workout) => workout.type === "Strength");
    expect(lateCardio.length).toBeGreaterThan(0);
    expect(lateCardio.every((workout) => workout.type === "Outdoor long hike")).toBe(true);
    expect(lateCardio.every((workout) => workout.durationMinutes >= 60)).toBe(true);
    if (lateStrength.length > 0) {
      expect(Math.max(...lateStrength.map((workout) => workout.durationMinutes))).toBeLessThanOrEqual(15);
    }
  });

  it("warns when stacked high-intensity days are consecutive", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      daysPerWeek: 2,
      includeStrength: true,
      strengthOnCardioDays: true,
      strengthSessionsPerWeek: 2,
      constraints: {
        treadmillMaxInclinePercent: 12,
        treadmillSessionsPerWeek: 1,
        outdoorHikesPerWeek: 1,
        maxSpeedMph: 4,
      },
      anyDays: true,
    });
    expect(
      plan.warnings.some((warning) => warning.includes("consecutive high-intensity days"))
    ).toBe(true);
  });

  it("keeps week one volume small for baseline zero", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      baselineMinutes: 0,
    });
    expect(plan.weeks[0].totalMinutes).toBeLessThanOrEqual(90);
  });

  it("peak long session approaches hike duration target", () => {
    const plan = buildTrainingPlan({
      ...sampleInputs,
      baselineMinutes: 120,
    });
    const longSessions = plan.weeks
      .flatMap((week) => week.days)
      .flatMap((day) => day.workouts)
      .filter((workout) => workout.type === "Outdoor long hike");
    if (longSessions.length === 0) return;
    const peak = Math.max(...longSessions.map((workout) => workout.durationMinutes));
    expect(peak).toBeGreaterThan(60);
  });
});
