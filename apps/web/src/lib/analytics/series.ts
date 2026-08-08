import type { SeriesPoint } from "@/lib/analytics/poisson";

/** Rolling ~1h point rate series (pts/hour), matching legacy site. */
export function derivePPHSeries(pointsSeries: SeriesPoint[] | null | undefined): SeriesPoint[] {
  if (!Array.isArray(pointsSeries) || pointsSeries.length < 2) return [];
  const WINDOW_MS = 60 * 60 * 1000;
  const sorted = [...pointsSeries].sort((a, b) => a.timestamp - b.timestamp);
  const result: SeriesPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    let base: SeriesPoint | null = null;
    for (let j = i - 1; j >= 0; j--) {
      base = sorted[j]!;
      if (cur.timestamp - sorted[j]!.timestamp >= WINDOW_MS) break;
    }
    if (!base || base.timestamp >= cur.timestamp) continue;
    const dt = cur.timestamp - base.timestamp;
    const pph = ((cur.value - base.value) / dt) * 3_600_000;
    if (pph >= 0 && Number.isFinite(pph)) {
      result.push({ timestamp: cur.timestamp, value: pph });
    }
  }
  return result;
}
