import { describe, expect, test } from "bun:test";
import { calculatePph, deltaAtWindow, estimateRate, sampleSeriesAt } from "./stats";

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
