export type SeriesPoint = { timestamp: number; value: number };

export type SilenceInfo = {
  level: "silent" | "slow" | "below" | "good";
  label: string;
  detail: string;
};

export type PoissonStats = {
  lambda: number;
  ciLow: number;
  ciHigh: number;
  ciHalfWidth: number;
  obsHours: number;
  totalGained: number;
  currentPoints: number;
  silence: SilenceInfo | null;
};

export type TallyResult = {
  total: number;
  low: number;
  high: number;
};

function poissonCDF(k: number, lambda: number): number {
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= Math.ceil(k); i++) {
    sum += term;
    if (i >= k) break;
    term *= lambda / (i + 1);
    if (term < 1e-12) break;
  }
  return Math.min(1, sum);
}

function standardNormalCDF(z: number): number {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z * z)));
}

export function computePoissonStats(
  series: SeriesPoint[] | null | undefined,
  _battleStartedAt?: number | null,
  _generatedAt?: number | null,
): PoissonStats | null {
  if (!Array.isArray(series) || series.length < 2) return null;

  const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const totalGained = last.value - first.value;
  const obsMs = last.timestamp - first.timestamp;
  const obsHours = obsMs / 3_600_000;

  if (obsHours < 1 / 60 || totalGained < 0) return null;

  const lambda = totalGained / obsHours;
  const se = Math.sqrt(lambda / obsHours);
  const ciHalfWidth = 1.96 * se;
  const ciLow = Math.max(0, lambda - ciHalfWidth);
  const ciHigh = lambda + ciHalfWidth;
  const currentPoints = last.value;

  let silence: SilenceInfo | null = null;
  if (obsHours >= 0.5 && lambda > 0) {
    const WINDOW_MS = 30 * 60 * 1000;
    const windowStart = last.timestamp - WINDOW_MS;

    let baseValue = sorted[0]!.value;
    let baseTimestamp = sorted[0]!.timestamp;
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i]!.timestamp <= windowStart) {
        baseValue = sorted[i]!.value;
        baseTimestamp = sorted[i]!.timestamp;
        break;
      }
    }

    const actualWindowHours = (last.timestamp - baseTimestamp) / 3_600_000;
    if (actualWindowHours >= 1 / 12) {
      const observed = Math.max(0, last.value - baseValue);
      const expected = lambda * actualWindowHours;

      if (expected >= 1) {
        const recentRate = observed / actualWindowHours;
        const ratioToMean = recentRate / lambda;
        const windowMinutes = Math.round(actualWindowHours * 60);
        const pct = Math.round(ratioToMean * 100);

        if (ratioToMean < 0.7) {
          let pValue: number;
          if (expected <= 40) {
            pValue = poissonCDF(observed, expected);
          } else {
            pValue = standardNormalCDF((observed - expected) / Math.sqrt(expected));
          }

          if (pValue < 0.1) {
            if (pValue < 0.01 && ratioToMean < 0.2) {
              silence = {
                level: "silent",
                label: "Went silent",
                detail: `Last ${windowMinutes}m rate is ${pct}% of their mean, likely AFK`,
              };
            } else if (pValue < 0.05 && ratioToMean < 0.4) {
              silence = {
                level: "slow",
                label: "Rate dropped",
                detail: `Last ${windowMinutes}m at ${pct}% of mean, pace slowed significantly`,
              };
            } else {
              silence = {
                level: "below",
                label: "Below average",
                detail: `Last ${windowMinutes}m at ${pct}% of mean, below typical pace`,
              };
            }
          }
        } else if (ratioToMean >= 0.8 && observed > 0) {
          const detail =
            ratioToMean >= 1.15
              ? `Last ${windowMinutes}m at ${pct}% of mean, above expected pace`
              : `Last ${windowMinutes}m at ${pct}% of mean, on pace`;
          silence = { level: "good", label: "All Good!", detail };
        }
      }
    }
  }

  return {
    lambda,
    ciLow,
    ciHigh,
    ciHalfWidth,
    obsHours,
    totalGained,
    currentPoints,
    silence,
  };
}

export function computeTally(stats: PoissonStats, hours: number): TallyResult {
  const expectedAdd = stats.lambda * hours;
  const predSD = Math.sqrt(stats.lambda * hours);
  const total = stats.currentPoints + expectedAdd;
  const low = stats.currentPoints + Math.max(0, expectedAdd - 1.96 * predSD);
  const high = stats.currentPoints + expectedAdd + 1.96 * predSD;
  return { total, low, high };
}
