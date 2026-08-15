import { describe, expect, test } from "bun:test";

import {
  PER_MEMBER_CAP_PPH,
  analyze,
  last5mChange,
  normalizeSeries,
  paceDeltas,
  projectClan,
  recentDeltas,
} from "./projection";

describe("projection pace", () => {
  test("recentDeltas normalizes irregular gaps to 5m", () => {
    const series = [
      { timestamp: 0, value: 0 },
      { timestamp: 10 * 60_000, value: 100 },
    ];
    const d = recentDeltas(series, 60 * 60_000);
    expect(d.length).toBe(1);
    expect(Math.abs(d[0]! - 50)).toBeLessThan(1e-9);
  });

  test("paceDeltas prefers short lookback when enough samples", () => {
    const now = Date.now();
    const series = Array.from({ length: 8 }, (_, i) => ({
      timestamp: now - (7 - i) * 5 * 60_000,
      value: i * 10,
    }));
    const d = paceDeltas(series);
    expect(d.length).toBeGreaterThanOrEqual(3);
    expect(d.every((x) => x === 10)).toBe(true);
  });

  test("projectClan uses raw observed pace by default (no uptime crush)", () => {
    const now = Date.now();
    // 7.7M PPH → 7.7M/12 per 5m
    const per5 = 7_700_000 / 12;
    const series = Array.from({ length: 8 }, (_, i) => ({
      timestamp: now - (7 - i) * 5 * 60_000,
      value: 622_000_000 + i * per5,
    }));
    const hoursLeft = 67;
    const p = projectClan(
      {
        name: "K0ii",
        points: series.at(-1)!.value,
        series,
        memberCount: 140,
        pph: 7_700_000,
      },
      hoursLeft * 60 * 60 * 1000,
    );
    expect(p).toBeTruthy();
    expect(p!.uptime).toBeNull();
    expect(p!.perHour).toBeGreaterThan(7_000_000);
    // ~622M + 7.7M*67 ≈ 1.14B
    expect(p!.projected).toBeGreaterThan(1_000_000_000);
    expect(p!.projected).toBeLessThan(1_300_000_000);
  });

  test("legacy useUptime still clamps when opted in", () => {
    const now = Date.now();
    const series = Array.from({ length: 8 }, (_, i) => ({
      timestamp: now - (7 - i) * 5 * 60_000,
      value: i * (110 / 12),
    }));
    const p = projectClan(
      { name: "Us", points: series.at(-1)!.value, series, memberCount: 1 },
      12 * 60 * 60 * 1000,
      { useUptime: true },
    );
    expect(p).toBeTruthy();
    expect(p!.uptime).not.toBeNull();
    expect(p!.capRatePerHour).toBe(PER_MEMBER_CAP_PPH);
  });

  test("analyze returns projected rank when rivals have series", () => {
    const now = Date.now();
    const mk = (name: string, start: number, per5: number, rank: number) => ({
      name,
      points: start + per5 * 6,
      memberCount: 10,
      rank,
      series: Array.from({ length: 7 }, (_, i) => ({
        timestamp: now - (6 - i) * 5 * 60_000,
        value: start + per5 * i,
      })),
    });
    const result = analyze(
      [mk("K0ii", 10000, 40, 3), mk("Rival", 10500, 30, 2)],
      "K0ii",
      24 * 60 * 60 * 1000,
      { trials: 200, random: () => 0.5 },
    );
    expect(result).toBeTruthy();
    expect(result!.ours.name).toBe("K0ii");
    expect(result!.projectedRank).toBeGreaterThanOrEqual(1);
    expect(result!.projections.length).toBe(2);
    expect(result!.ours.projected).toBeGreaterThan(
      result!.projections.find((p) => p.name === "Rival")!.projected,
    );
  });

  test("last5mChange + normalizeSeries", () => {
    const now = 1_000_000;
    const series = normalizeSeries([
      { t: now - 5 * 60_000, points: 100 },
      { t: now, points: 150 },
    ]);
    expect(series.length).toBe(2);
    expect(last5mChange(series)).toBe(50);
  });
});
