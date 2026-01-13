import { describe, expect, it } from "vitest";
import {
  clampNumber,
  getPlanIntensity,
  sanitizeNumber,
  trimPreferredDays,
  validateTrainingForm,
} from "./validators";

describe("validators", () => {
  it("clamps numbers to range", () => {
    expect(clampNumber(12, 0, 10)).toBe(10);
  });

  it("sanitizes and clamps numeric input", () => {
    expect(sanitizeNumber("010", 0, 20, 0.5)).toBe(10);
    expect(sanitizeNumber("999", 0, 20, 0.5)).toBe(20);
    expect(sanitizeNumber("0008", 0, 20, 1)).toBe(8);
  });

  it("trims preferred days when limit decreases", () => {
    expect(trimPreferredDays([0, 2, 4], 2)).toEqual([0, 2]);
  });

  it("prevents treadmill sessions above days per week", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 3,
      preferredDays: [0, 2, 4],
      anyDays: false,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 4,
      outdoorHikesPerWeek: 1,
      strengthSessionsPerWeek: 0,
      includeStrength: false,
      strengthOnCardioDays: true,
      fillActiveRecoveryDays: true,
    });
    expect(errors.treadmillSessionsPerWeek).toBeDefined();
  });

  it("prevents total sessions above training days", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 4,
      preferredDays: [],
      anyDays: true,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 3,
      outdoorHikesPerWeek: 2,
      strengthSessionsPerWeek: 1,
      includeStrength: true,
      strengthOnCardioDays: true,
      fillActiveRecoveryDays: true,
    });
    expect(errors.treadmillSessionsPerWeek).toBeDefined();
  });

  it("flags aggressive intensity for low baseline and high sessions", () => {
    expect(getPlanIntensity(20, 5)).toBe("aggressive");
  });

  it("requires at least one cardio session", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 3,
      preferredDays: [],
      anyDays: true,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 0,
      outdoorHikesPerWeek: 0,
      strengthSessionsPerWeek: 1,
      includeStrength: true,
      strengthOnCardioDays: true,
      fillActiveRecoveryDays: true,
    });
    expect(errors.treadmillSessionsPerWeek).toBeDefined();
  });

  it("prevents strength sessions overflow", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 3,
      preferredDays: [],
      anyDays: true,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 2,
      outdoorHikesPerWeek: 1,
      strengthSessionsPerWeek: 2,
      includeStrength: true,
      strengthOnCardioDays: false,
      fillActiveRecoveryDays: true,
    });
    expect(errors.treadmillSessionsPerWeek).toBeDefined();
  });

  it("requires preferred days to cover required sessions", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 4,
      preferredDays: [1, 3],
      anyDays: false,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 2,
      outdoorHikesPerWeek: 1,
      strengthSessionsPerWeek: 1,
      includeStrength: true,
      strengthOnCardioDays: false,
      fillActiveRecoveryDays: true,
    });
    expect(errors.preferredDaysLimit).toBeDefined();
  });

  it("rejects strength sessions when cardio-only", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 4,
      preferredDays: [],
      anyDays: true,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 2,
      outdoorHikesPerWeek: 1,
      strengthSessionsPerWeek: 2,
      includeStrength: false,
      strengthOnCardioDays: true,
      fillActiveRecoveryDays: true,
    });
    expect(errors.strengthSessionsPerWeek).toBeDefined();
  });

  it("requires stacked strength to fit within cardio sessions", () => {
    const errors = validateTrainingForm({
      trainingStartDate: "2026-01-01",
      targetDate: "2026-02-01",
      daysPerWeek: 4,
      preferredDays: [],
      anyDays: true,
      baselineMinutes: 0,
      treadmillMaxInclinePercent: 10,
      maxSpeedMph: 4,
      treadmillSessionsPerWeek: 1,
      outdoorHikesPerWeek: 0,
      strengthSessionsPerWeek: 2,
      includeStrength: true,
      strengthOnCardioDays: true,
      fillActiveRecoveryDays: true,
    });
    expect(errors.strengthSessionsPerWeek).toBeDefined();
  });
});
