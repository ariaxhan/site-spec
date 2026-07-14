import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  contrastRatio,
  darken,
  darkenToContrast,
} from "../src/ui/colors";

describe("colors — WCAG contrast math", () => {
  it("parses #rgb and #rrggbb", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#416353")).toEqual([65, 99, 83]);
    expect(hexToRgb("nope")).toBeNull();
  });

  it("computes known contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // sage green vs white ≈ 6.7:1 (passes AA)
    expect(contrastRatio("#416353", "#ffffff")).toBeGreaterThan(4.5);
  });

  it("darken moves toward black", () => {
    expect(darken("#ffffff", 0.5)).toBe("#808080");
    expect(darken("#808080", 1)).toBe("#000000");
  });

  it("darkenToContrast leaves an already-passing colour unchanged", () => {
    // sage green already clears 4.5:1 against white → untouched, hue preserved
    expect(darkenToContrast("#416353", "#ffffff", 4.5)).toBe("#416353");
  });

  it("darkenToContrast darkens a light brand colour until it passes", () => {
    // a bright yellow fails white-text contrast; the guard must fix it
    const before = contrastRatio("#ffd400", "#ffffff");
    expect(before).toBeLessThan(4.5);
    const fixed = darkenToContrast("#ffd400", "#ffffff", 4.5);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
