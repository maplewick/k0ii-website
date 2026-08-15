import { describe, expect, test } from "bun:test";
import {
  calculatePph,
  deltaAtWindow,
  estimateRate,
  preferredPacePph,
  sampleSeriesAt,
} from "./stats";

describe("sampleSeriesAt", () => {
  test("interpolates between snapshots", () => {
    const series = [
      { timestamp: 0, value: 0 },
      { timestamp: 10_000, value: 100 },
    ];
    const sample = sampleSeriesAt(series, 5_000);
    expect(sample?.value).toBe(50);
  });
});

describe("calculatePph", () => {
  test("works with short history before full hour elapses", () => {
    const series = [
      { timestamp: 0, value: 0 },
      { timestamp: 5 * 60 * 1000, value: 500 },
    ];
    expect(calculatePph(series)).toBe(6_000);
  });

  test("returns null when points drop", () => {
    const series = [
      { timestamp: 0, value: 100 },
      { timestamp: 5 * 60 * 1000, value: 50 },
    ];
    expect(calculatePph(series)).toBeNull();
  });
});

describe("preferredPacePph", () => {
  test("prefers 30m window when available", () => {
    const series = [
      { timestamp: 0, value: 0 },
      { timestamp: 30 * 60 * 1000, value: 3_000 },
      { timestamp: 60 * 60 * 1000, value: 9_000 },
    ];
    // Last 30m: +6000 → 12k pph (more recent burst than hour avg 9k)
    expect(preferredPacePph(series)).toBe(12_000);
  });
});

describe("deltaAtWindow", () => {
  test("uses latest snapshot as reference", () => {
    const series = [
      { timestamp: 1_000, value: 10 },
      { timestamp: 6 * 60 * 1000 + 1_000, value: 40 },
    ];
    expect(deltaAtWindow(series, 5 * 60 * 1000)).toBe(25);
  });
});

describe("estimateRate", () => {
  test("requires minimum window", () => {
    expect(estimateRate(100, 90, 60_000)).toBeNull();
  });
});
