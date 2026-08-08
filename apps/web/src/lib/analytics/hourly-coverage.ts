/**
 * Hourly clan production buckets from battle points series
 * (upstream website coverage panel / Discord /coverage).
 */

export type HourlyProduction = {
  buckets: number[];
  counts: number[];
  total: number;
};

export function buildHourlyProduction(
  series: Array<{ timestamp: number; value: number }> | null | undefined,
  useLocal: boolean,
): HourlyProduction {
  const buckets = new Array(24).fill(0) as number[];
  const counts = new Array(24).fill(0) as number[];
  if (!Array.isArray(series) || series.length < 2) {
    return { buckets, counts, total: 0 };
  }

  for (let i = 1; i < series.length; i++) {
    const t = Number(series[i]!.timestamp);
    const dt = t - Number(series[i - 1]!.timestamp);
    if (dt <= 0 || dt > 30 * 60_000) continue;
    const gain = Number(series[i]!.value) - Number(series[i - 1]!.value);
    if (!Number.isFinite(gain) || gain < 0) continue;
    const d = new Date(t);
    const hour = useLocal ? d.getHours() : d.getUTCHours();
    buckets[hour]! += gain;
    counts[hour]! += dt;
  }

  const rates = buckets.map((sum, h) =>
    counts[h]! > 0 ? (sum / counts[h]!) * 3_600_000 : 0,
  );
  return {
    buckets: rates,
    counts,
    total: rates.reduce((a, b) => a + b, 0),
  };
}
