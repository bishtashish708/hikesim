import { describe, expect, it } from "vitest";
import {
  formatElevation,
  formatFeet,
  formatIncline,
  formatMiles,
  formatMinutes,
  formatSpeed,
  roundToStep,
} from "./formatters";

describe("formatters", () => {
  it("formats miles with 1-2 decimals", () => {
    expect(formatMiles(3.25)).toBe("3.25 mi");
    expect(formatMiles(3)).toBe("3 mi");
    expect(formatMiles(12.3)).toBe("12.3 mi");
    expect(formatMiles(3.256)).toBe("3.26 mi");
  });

  it("formats elevation with commas and ft suffix", () => {
    expect(formatElevation(10540.4)).toBe("10,540 ft");
  });

  it("formats feet with commas", () => {
    expect(formatFeet(10540)).toBe("10,540 ft");
  });

  it("rounds values to step size", () => {
    expect(roundToStep(5.26247, 0.5)).toBe(5.5);
  });

  it("formats incline without long decimals", () => {
    expect(formatIncline(5.0)).toBe("5%");
    expect(formatIncline(5.5)).toBe("5.5%");
  });

  it("formats speed and minutes", () => {
    expect(formatSpeed(3.444)).toBe("3.4 mph");
    expect(formatMinutes(22.25)).toBe("22.5");
    expect(formatMinutes(0)).toBe("0");
  });
});
