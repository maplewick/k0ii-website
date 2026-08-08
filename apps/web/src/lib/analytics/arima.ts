import type { SeriesPoint } from "./poisson";

export type ArimaModel = {
  phi: number;
  c: number;
  sigma: number;
  lastRate: number;
  lastValue: number;
  lastTimestamp: number;
  nObs: number;
  obsHours: number;
  /** Mean inter-sample hours used for rate extraction. */
  meanStepH: number;
  /** Effective rate samples after filtering. */
  nRates: number;
};

export type ForecastPoint = {
  ts: number;
  median: number;
  low80: number;
  high80: number;
  low95: number;
  high95: number;
  /** Share of sims above compare median at this step (0-1), if joint run. */
  winProb?: number;
};

export type MonteCarloResult = {
  forecast: ForecastPoint[];
  /** Rival percentile path when `compare` model was supplied. */
  compareForecast: ForecastPoint[] | null;
  /** Sparse sample trajectories for fan chart: samples[pathIdx][step] = value. */
  samplePaths: number[][];
  /** All sim values at the final forecast step (for finish-odds). */
  terminalValues: number[];
  /** Timestamps aligned with forecast steps. */
  timestamps: number[];
  nSim: number;
  /** Hours covered by this run. */
  horizonH: number;
  stepH: number;
};

/** Default Monte Carlo draw count. */
export const FORECAST_SIMS = 2000;

/** Paths kept for fan visualization (subset of sims). */
export const FORECAST_FAN_PATHS = 48;

/** Horizon hours shown on the simulation strip. */
export const FORECAST_HORIZONS = [1, 3, 6, 24] as const;

export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

const MAX_SERIES = 2_000;
const MIN_RATE_SAMPLES = 6;
const MIN_POINTS = 8;
/** Halflife (in rate samples) for exponentially weighted OLS. */
const WEIGHT_HALFLIFE = 8;
/** Blend weight for EWMA start rate vs last observed rate. */
const START_RATE_BLEND = 0.65;

/** Steady-state rate for AR(1): c / (1 − φ). Null if φ ≈ 1. */
export function longRunRate(model: ArimaModel): number | null {
  const denom = 1 - model.phi;
  if (Math.abs(denom) < 1e-6) return null;
  const rate = model.c / denom;
  return Number.isFinite(rate) ? Math.max(0, rate) : null;
}

/** Pick the forecast step nearest to `hours` ahead. */
export function pickHorizon(
  forecast: ForecastPoint[],
  hours: number,
  stepH = 0.5,
): ForecastPoint | null {
  if (!forecast.length || hours <= 0) return null;
  const idx = Math.min(
    forecast.length - 1,
    Math.max(0, Math.round(hours / stepH) - 1),
  );
  return forecast[idx] ?? null;
}

/** Deterministic seed from series shape so re-renders stay stable. */
export function seriesSeed(series: SeriesPoint[]): number {
  let h = 2166136261;
  const n = Math.min(series.length, 64);
  for (let i = 0; i < n; i++) {
    const p = series[i]!;
    h ^= Math.floor(p.timestamp) | 0;
    h = Math.imul(h, 16777619);
    h ^= Math.floor(p.value) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= series.length;
  return h >>> 0;
}

/** Mulberry32 PRNG. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianFrom(rand: () => number): number {
  const u = Math.max(1e-12, 1 - rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], f: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0]!;
  const pos = (n - 1) * f;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const w = pos - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function winsorize(values: number[], loQ = 0.1, hiQ = 0.9): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const lo = percentile(sorted, loQ);
  const hi = percentile(sorted, hiQ);
  // Also cap at median + 2.5× IQR so a single spike cannot set the hi fence.
  const q25 = percentile(sorted, 0.25);
  const q75 = percentile(sorted, 0.75);
  const iqr = Math.max(0, q75 - q25);
  const med = percentile(sorted, 0.5);
  const softHi = med + 2.5 * Math.max(iqr, med * 0.15);
  const cap = Math.min(hi, softHi);
  return values.map((v) => Math.min(cap, Math.max(lo, v)));
}

function extractRates(sorted: SeriesPoint[]): {
  rates: number[];
  meanStepH: number;
} {
  const rates: number[] = [];
  let stepSum = 0;
  let stepN = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dtH = (sorted[i]!.timestamp - sorted[i - 1]!.timestamp) / 3_600_000;
    if (dtH < 0.05 || dtH > 3) continue;
    const dv = sorted[i]!.value - sorted[i - 1]!.value;
    // Treat dips as zero pace (disconnect / snapshot noise), not negative grind.
    const rate = Math.max(0, dv) / dtH;
    rates.push(rate);
    stepSum += dtH;
    stepN += 1;
  }
  return {
    rates: winsorize(rates),
    meanStepH: stepN > 0 ? stepSum / stepN : 0.5,
  };
}

/**
 * Fit ARIMA(1,1,0) on point *rates* (PPH), with exponentially weighted OLS
 * so recent battle pace dominates older samples.
 */
export function fitARIMA(series: SeriesPoint[]): ArimaModel | null {
  const capped =
    series.length > MAX_SERIES ? series.slice(-MAX_SERIES) : series;
  const sorted = [...capped].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < MIN_POINTS) return null;

  const { rates: rawRates, meanStepH } = extractRates(sorted);
  if (rawRates.length < MIN_RATE_SAMPLES) return null;

  const rates = rawRates;
  const n = rates.length;
  const decay = Math.pow(0.5, 1 / WEIGHT_HALFLIFE);

  // Weighted AR(1): r_t = c + φ r_{t-1} + ε
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let w = 1;
  // Walk newest → oldest so recent pairs get higher weight.
  const pairs: { x: number; y: number }[] = [];
  for (let i = 1; i < n; i++) {
    pairs.push({ x: rates[i - 1]!, y: rates[i]! });
  }
  for (let i = pairs.length - 1; i >= 0; i--) {
    const { x, y } = pairs[i]!;
    sw += w;
    sx += w * x;
    sy += w * y;
    sxy += w * x * y;
    sxx += w * x * x;
    w *= decay;
  }

  const denom = sw * sxx - sx * sx;
  let phi = denom !== 0 ? (sw * sxy - sx * sy) / denom : 0;
  phi = Math.max(-0.95, Math.min(0.95, phi));
  const c = (sy - phi * sx) / sw;

  // Weighted residual σ
  let ssq = 0;
  let w2 = 1;
  let wSum = 0;
  for (let i = pairs.length - 1; i >= 0; i--) {
    const { x, y } = pairs[i]!;
    const resid = y - c - phi * x;
    ssq += w2 * resid * resid;
    wSum += w2;
    w2 *= decay;
  }
  const sigma = Math.sqrt(ssq / Math.max(1e-9, wSum));

  // Start rate: blend last observation with short EWMA of recent rates.
  const ewmaDecay = 0.7;
  let ewma = rates[0]!;
  for (let i = 1; i < n; i++) {
    ewma = ewmaDecay * rates[i]! + (1 - ewmaDecay) * ewma;
  }
  const lastRate =
    START_RATE_BLEND * rates[n - 1]! + (1 - START_RATE_BLEND) * ewma;

  return {
    phi,
    c,
    sigma: Math.max(0, sigma),
    lastRate: Math.max(0, lastRate),
    lastValue: sorted[sorted.length - 1]!.value,
    lastTimestamp: sorted[sorted.length - 1]!.timestamp,
    nObs: sorted.length,
    obsHours:
      (sorted[sorted.length - 1]!.timestamp - sorted[0]!.timestamp) / 3_600_000,
    meanStepH,
    nRates: n,
  };
}

function runSims(
  model: ArimaModel,
  stepH: number,
  nSteps: number,
  nSim: number,
  rand: () => number,
): number[][] {
  const { phi, c, sigma, lastRate, lastValue } = model;
  const dists: number[][] = Array.from({ length: nSteps }, () => []);

  for (let s = 0; s < nSim; s++) {
    let r = lastRate;
    let v = lastValue;
    for (let h = 0; h < nSteps; h++) {
      r = c + phi * r + sigma * gaussianFrom(rand);
      // Soft floor: allow tiny noise but no negative grind.
      v += Math.max(0, r) * stepH;
      dists[h]!.push(v);
    }
  }
  return dists;
}

/**
 * Full Monte Carlo bundle: percentile path + fan sample trajectories.
 * Seeded from series so the same snapshot redraws the same fan.
 */
export function runMonteCarlo(
  model: ArimaModel,
  options: {
    stepH?: number;
    horizonH?: number;
    nSim?: number;
    fanPaths?: number;
    seed?: number;
    /** Optional rival model for P(we lead) at each step. */
    compare?: ArimaModel | null;
  } = {},
): MonteCarloResult {
  const stepH = options.stepH ?? 0.5;
  const horizonH = options.horizonH ?? 24;
  const nSim = options.nSim ?? FORECAST_SIMS;
  const fanPaths = Math.min(
    Math.max(0, options.fanPaths ?? FORECAST_FAN_PATHS),
    nSim,
  );
  const nSteps = Math.ceil(horizonH / stepH);
  const seed = options.seed ?? 1;
  const rand = mulberry32(seed);

  const dists = runSims(model, stepH, nSteps, nSim, rand);

  let compareDists: number[][] | null = null;
  if (options.compare) {
    // Independent stream offset so ours/theirs stay uncorrelated.
    const rivalRand = mulberry32((seed ^ 0xa5a5a5a5) >>> 0);
    compareDists = runSims(options.compare, stepH, nSteps, nSim, rivalRand);
  }

  const timestamps = Array.from(
    { length: nSteps },
    (_, i) => model.lastTimestamp + (i + 1) * stepH * 3_600_000,
  );

  const forecast: ForecastPoint[] = dists.map((vals, i) => {
    const sorted = [...vals].sort((a, b) => a - b);
    let winProb: number | undefined;
    if (compareDists) {
      const rival = compareDists[i]!;
      let wins = 0;
      for (let s = 0; s < nSim; s++) {
        if (vals[s]! >= rival[s]!) wins += 1;
      }
      winProb = wins / nSim;
    }
    return {
      ts: timestamps[i]!,
      median: percentile(sorted, 0.5),
      low80: percentile(sorted, 0.1),
      high80: percentile(sorted, 0.9),
      low95: percentile(sorted, 0.025),
      high95: percentile(sorted, 0.975),
      winProb,
    };
  });

  const compareForecast: ForecastPoint[] | null = compareDists
    ? compareDists.map((vals, i) => {
        const sorted = [...vals].sort((a, b) => a - b);
        return {
          ts: timestamps[i]!,
          median: percentile(sorted, 0.5),
          low80: percentile(sorted, 0.1),
          high80: percentile(sorted, 0.9),
          low95: percentile(sorted, 0.025),
          high95: percentile(sorted, 0.975),
        };
      })
    : null;

  const samplePaths: number[][] = [];
  if (fanPaths > 0) {
    const stride = Math.max(1, Math.floor(nSim / fanPaths));
    for (let p = 0; p < fanPaths; p++) {
      const simIdx = Math.min(nSim - 1, p * stride);
      samplePaths.push(dists.map((step) => step[simIdx]!));
    }
  }

  const terminalValues = dists[nSteps - 1] ? [...dists[nSteps - 1]!] : [];

  return {
    forecast,
    compareForecast,
    samplePaths,
    terminalValues,
    timestamps,
    nSim,
    horizonH,
    stepH,
  };
}

/** Back-compat wrapper used by older call sites. */
export function forecastARIMAPath(
  model: ArimaModel,
  stepH = 0.5,
  horizonH = 24,
  nSim = FORECAST_SIMS,
  seed = 1,
): ForecastPoint[] {
  return runMonteCarlo(model, { stepH, horizonH, nSim, seed, fanPaths: 0 })
    .forecast;
}
