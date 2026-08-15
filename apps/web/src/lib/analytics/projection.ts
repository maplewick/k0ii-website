/**
 * Battle projection & win-probability model.
 * Projects observed pace (series / PPH) over remaining battle time.
 * Optional legacy uptime×cap path is opt-in only — modern PS99 rates
 * blow past any fixed per-member ceiling.
 */

export const INTERVAL_MS = 5 * 60 * 1000;
/** Prefer recent pace so catch-up / finish odds track the live war. */
export const LOOKBACK_MS = 2 * 60 * 60 * 1000;
/** Widen when the short window lacks samples (early battle / sparse polls). */
export const LOOKBACK_FALLBACK_MS = 6 * 60 * 60 * 1000;
export const MIN_SAMPLES = 3;
export const TRIALS = 4000;
/** Legacy soft ceiling — only used when opts.useUptime === true. */
export const PER_MEMBER_CAP_PPH = 220;
export const UPTIME_OVERSHOOT = 1.08;
export const UPTIME_MEAN_MAX = 1.12;

export type SeriesPoint = { timestamp: number; value: number };

export type ClanInput = {
  name: string;
  points: number;
  series?: SeriesPoint[] | null;
  pph?: number | null;
  rank?: number | null;
  memberCount?: number | null;
};

export type ClanProjection = {
  name: string;
  current: number;
  perInterval: number;
  perHour: number;
  sigma: number;
  projected: number;
  low: number;
  high: number;
  intervalsLeft: number;
  maxGain: number;
  uptime: number | null;
  capRatePerHour: number | null;
  memberCount: number | null;
  rank?: number | null;
};

export type StandingStats = {
  rankProbs: number[];
  expectedRank: number;
};

export type AnalyzeResult = {
  msRemaining: number;
  ours: ClanProjection;
  projections: ClanProjection[];
  standings: Record<string, StandingStats>;
  projectedRank: number;
  projectedRankInWindow: number;
  rankOffset: number;
  target: {
    name: string;
    deficit: number;
    catchUpPerHour: number | null;
  } | null;
  probAtOrAbove: (position: number) => number;
};

export type ProjectOpts = {
  lookbackMs?: number;
  perMemberCap?: number;
  /**
   * Legacy capacity×uptime clamp. Default false — PS99 clan PPH is far
   * above any fixed per-member cap, so enabling this under-projects badly.
   */
  useUptime?: boolean;
  trials?: number;
  /** Inject RNG for tests — default Math.random */
  random?: () => number;
};

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance =
    xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function randNorm(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function recentDeltas(
  series: SeriesPoint[] | null | undefined,
  lookbackMs = LOOKBACK_MS,
): number[] {
  if (!Array.isArray(series) || series.length < 2) return [];
  const end = Number(series[series.length - 1]!.timestamp);
  const cutoff = end - lookbackMs;
  const deltas: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const t = Number(series[i]!.timestamp);
    if (t < cutoff) continue;
    const dt = t - Number(series[i - 1]!.timestamp);
    if (dt <= 0) continue;
    const dv = Number(series[i]!.value) - Number(series[i - 1]!.value);
    // Ignore tiny negative noise from cleans; keep zeros (idle intervals).
    if (dv < 0) continue;
    deltas.push((dv / dt) * INTERVAL_MS);
  }
  return deltas;
}

/** Prefer short lookback; fall back to wider window when samples are thin. */
export function paceDeltas(
  series: SeriesPoint[] | null | undefined,
  preferMs = LOOKBACK_MS,
  fallbackMs = LOOKBACK_FALLBACK_MS,
): number[] {
  const short = recentDeltas(series, preferMs);
  if (short.length >= MIN_SAMPLES) return short;
  return recentDeltas(series, fallbackMs);
}

/** Recency-weighted mean — last intervals count more than early lookback. */
function weightedMean(xs: number[]): number {
  if (!xs.length) return 0;
  let wSum = 0;
  let xSum = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = i + 1;
    wSum += w;
    xSum += w * xs[i]!;
  }
  return xSum / wSum;
}

function capRatePer5m(memberCount: number, cap: number): number {
  return (memberCount * cap) / 12;
}

function pphToPerInterval(pph: number): number {
  return (pph / 60) * 5;
}

export function projectClan(
  clan: ClanInput,
  msRemaining: number,
  opts: ProjectOpts = {},
): ClanProjection | null {
  const lookbackMs = opts.lookbackMs ?? LOOKBACK_MS;
  const cap = Number(opts.perMemberCap ?? PER_MEMBER_CAP_PPH);
  const current = Number(clan.points) || 0;
  const intervalsLeft = Math.max(0, msRemaining / INTERVAL_MS);
  const memberCount = Number(clan.memberCount);
  // Opt-in only — default projects raw observed pace over remaining time.
  const useUptime =
    opts.useUptime === true &&
    Number.isFinite(memberCount) &&
    memberCount > 0 &&
    cap > 0;

  const deltas = paceDeltas(
    clan.series,
    lookbackMs,
    opts.lookbackMs != null ? lookbackMs : LOOKBACK_FALLBACK_MS,
  );
  const capRate5m = useUptime ? capRatePer5m(memberCount, cap) : null;

  let perInterval: number;
  let perIntervalSd: number;
  let sampleCount: number;
  let uptime: number | null = null;

  if (deltas.length >= MIN_SAMPLES) {
    if (useUptime && capRate5m) {
      const values = deltas.map((d) => clamp(d / capRate5m, 0, 1.5));
      uptime = clamp(weightedMean(values), 0, UPTIME_MEAN_MAX);
      const sdUnit = stdDev(values);
      sampleCount = values.length;
      perInterval = uptime * capRate5m;
      perIntervalSd = sdUnit * capRate5m;
    } else {
      perInterval = weightedMean(deltas);
      perIntervalSd = stdDev(deltas);
      sampleCount = deltas.length;
      // If series is thin but API PPH is much higher, trust the higher signal.
      const pph = Number(clan.pph);
      if (Number.isFinite(pph) && pph > 0) {
        const fromPph = pphToPerInterval(pph);
        if (fromPph > perInterval * 1.25) {
          perInterval = fromPph;
          perIntervalSd = Math.max(perIntervalSd, fromPph * 0.15);
          sampleCount = Math.max(sampleCount, 3);
        }
      }
    }
  } else if (Number.isFinite(Number(clan.pph))) {
    const fromPph = pphToPerInterval(Number(clan.pph));
    if (useUptime && capRate5m) {
      uptime = clamp(fromPph / capRate5m, 0, UPTIME_MEAN_MAX);
      perInterval = uptime * capRate5m;
      perIntervalSd = Math.min(0.12, Math.max(0.04, uptime * 0.2)) * capRate5m;
    } else {
      perInterval = fromPph;
      perIntervalSd = Math.max(fromPph * 0.15, 1);
    }
    sampleCount = 1;
  } else {
    return null;
  }

  // Never project negative pace.
  perInterval = Math.max(0, perInterval);
  perIntervalSd = Math.max(0, perIntervalSd);

  const rateStdErr = perIntervalSd / Math.sqrt(Math.max(1, sampleCount));
  const noiseVar = perIntervalSd * perIntervalSd * intervalsLeft;
  const rateVar =
    rateStdErr * intervalsLeft * (rateStdErr * intervalsLeft);

  const gain = perInterval * intervalsLeft;
  const projected = current + gain;
  const minSigma = Math.abs(gain) * 0.04;
  const sigma = Math.max(Math.sqrt(noiseVar + rateVar), minSigma);
  const maxGain = useUptime && capRate5m
    ? capRate5m * UPTIME_OVERSHOOT * intervalsLeft
    : Infinity;

  return {
    name: clan.name,
    current,
    perInterval,
    perHour: perInterval * 12,
    sigma,
    projected,
    low: Math.max(current, projected - 1.96 * sigma),
    high: Math.min(current + maxGain, projected + 1.96 * sigma),
    intervalsLeft,
    maxGain,
    uptime,
    capRatePerHour: useUptime && capRate5m ? capRate5m * 12 : null,
    memberCount: Number.isFinite(memberCount) ? memberCount : null,
  };
}

export function simulateStandings(
  projections: (ClanProjection | null | undefined)[],
  trials = TRIALS,
  random: () => number = Math.random,
): Record<string, StandingStats> {
  const valid = projections.filter(Boolean) as ClanProjection[];
  if (!valid.length) return {};

  const rankCounts: Record<string, number[]> = {};
  for (const p of valid) {
    rankCounts[p.name] = new Array(valid.length + 1).fill(0);
  }

  const draw: { name: string; value: number }[] = new Array(valid.length);
  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < valid.length; i++) {
      const p = valid[i]!;
      const raw = p.projected + randNorm(random) * p.sigma;
      const maxValue =
        p.current + (Number.isFinite(p.maxGain) ? p.maxGain : Infinity);
      draw[i] = { name: p.name, value: clamp(raw, p.current, maxValue) };
    }
    draw.sort((a, b) => b.value - a.value);
    for (let i = 0; i < draw.length; i++) {
      rankCounts[draw[i]!.name]![i + 1]! += 1;
    }
  }

  const out: Record<string, StandingStats> = {};
  for (const p of valid) {
    const counts = rankCounts[p.name]!;
    const probs = counts.map((c) => c / trials);
    let expected = 0;
    for (let r = 1; r < probs.length; r++) expected += r * probs[r]!;
    out[p.name] = { rankProbs: probs, expectedRank: expected };
  }
  return out;
}

export function analyze(
  clans: ClanInput[],
  ourName: string,
  msRemaining: number,
  opts: ProjectOpts = {},
): AnalyzeResult | null {
  const projections = clans
    .map((c) => {
      const p = projectClan(c, msRemaining, opts);
      if (p) p.rank = c.rank ?? null;
      return p;
    })
    .filter(Boolean) as ClanProjection[];

  if (!projections.length) return null;

  const standings = simulateStandings(
    projections,
    opts.trials ?? TRIALS,
    opts.random,
  );
  const lower = (s: string | null | undefined) => String(s ?? "").toLowerCase();
  const ours = projections.find((p) => lower(p.name) === lower(ourName));
  if (!ours) return null;

  const ordered = [...projections].sort((a, b) => b.projected - a.projected);
  const projectedRankInWindow =
    ordered.findIndex((p) => lower(p.name) === lower(ours.name)) + 1;

  const topActualRank = ordered.reduce((min, p) => {
    const r = Number(p.rank);
    return Number.isFinite(r) && r < min ? r : min;
  }, Infinity);
  const rankOffset = Number.isFinite(topActualRank) ? topActualRank - 1 : 0;

  const aheadOfUs = ordered[projectedRankInWindow - 2] ?? null;
  let catchUpPerHour: number | null = null;
  if (aheadOfUs && ours.intervalsLeft > 0) {
    const deficit = aheadOfUs.projected - ours.projected;
    catchUpPerHour = (deficit / ours.intervalsLeft) * 12;
  }

  return {
    msRemaining,
    ours,
    projections: ordered,
    standings,
    projectedRank: projectedRankInWindow + rankOffset,
    projectedRankInWindow,
    rankOffset,
    target: aheadOfUs
      ? {
          name: aheadOfUs.name,
          deficit: aheadOfUs.projected - ours.projected,
          catchUpPerHour,
        }
      : null,
    probAtOrAbove(position: number) {
      const probs = standings[ours.name]?.rankProbs ?? [];
      let sum = 0;
      for (let r = 1; r <= position && r < probs.length; r++) sum += probs[r]!;
      return sum;
    },
  };
}

/** Points gained over ~last 5 minutes from a {timestamp,value} series. */
export function last5mChange(
  series: SeriesPoint[] | null | undefined,
): number | null {
  if (!Array.isArray(series) || series.length < 2) return null;
  const end = series[series.length - 1]!;
  const endT = Number(end.timestamp);
  const target = endT - INTERVAL_MS;
  let base: SeriesPoint | null = null;
  let best = Infinity;
  for (let i = series.length - 2; i >= 0; i--) {
    const t = Number(series[i]!.timestamp);
    const diff = Math.abs(t - target);
    if (diff < best) {
      best = diff;
      base = series[i]!;
    }
    if (t < target) break;
  }
  if (!base || Number(base.timestamp) >= endT) return null;
  return Number(end.value) - Number(base.value);
}

/** Normalize site series points that may use t/points or timestamp/value. */
export function normalizeSeries(series: unknown): SeriesPoint[] {
  if (!Array.isArray(series)) return [];
  const out: SeriesPoint[] = [];
  for (const raw of series) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const timestamp = Number(row.timestamp ?? row.t);
    const value = Number(row.value ?? row.points);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue;
    out.push({ timestamp, value });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}
