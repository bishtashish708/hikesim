import { describe, expect, it } from "vitest";
import { estimateDurationMinutes, generatePlan } from "./planGenerator";

const sampleProfile = [
  { distanceMiles: 0, elevationFt: 1000 },
  { distanceMiles: 0.5, elevationFt: 1100 },
  { distanceMiles: 1.0, elevationFt: 1200 },
  { distanceMiles: 1.5, elevationFt: 1180 },
  { distanceMiles: 2.0, elevationFt: 1300 },
  { distanceMiles: 2.5, elevationFt: 1400 },
  { distanceMiles: 3.0, elevationFt: 1500 },
  { distanceMiles: 3.5, elevationFt: 1600 },
  { distanceMiles: 4.0, elevationFt: 1680 },
  { distanceMiles: 4.5, elevationFt: 1750 },
  { distanceMiles: 5.0, elevationFt: 1800 },
];

describe("planGenerator", () => {
  it("estimates longer durations for lower fitness levels", () => {
    const beginner = estimateDurationMinutes(5, 1500, "Beginner");
    const advanced = estimateDurationMinutes(5, 1500, "Advanced");
    expect(beginner).toBeGreaterThan(advanced);
  });

  it("includes warm-up and cool-down segments", () => {
    const plan = generatePlan(sampleProfile, 5, 1500, {
      fitnessLevel: "Intermediate",
      targetDurationMinutes: 60,
      packWeightLbs: 10,
      treadmill: {
        minInclinePercent: 0,
        maxInclinePercent: 12,
        maxSpeedMph: 4.5,
      },
    });

    expect(plan.segments[0].notes).toContain("Warm-up");
    expect(plan.segments[plan.segments.length - 1].notes).toContain("Cool-down");
  });

  it("clamps incline within treadmill limits", () => {
    const plan = generatePlan(sampleProfile, 5, 1500, {
      fitnessLevel: "Advanced",
      targetDurationMinutes: 50,
      packWeightLbs: 0,
      treadmill: {
        minInclinePercent: 3,
        maxInclinePercent: 6,
        maxSpeedMph: 5,
      },
    });

    const inclines = plan.segments.map((segment) => segment.inclinePercent);
    expect(Math.min(...inclines)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...inclines)).toBeLessThanOrEqual(6);
  });
});
