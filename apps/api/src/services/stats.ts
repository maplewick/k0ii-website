const MIN_RATE_WINDOW_MS = 4 * 60 * 1000;
const DEFAULT_PPH_WINDOW_MS = 60 * 60 * 1000;

export type PointSample = { timestamp: number; points: number };
export type SeriesPoint = { timestamp: number; value: number };

export function estimateRate(
  currentPoints: number | null,
  pastPoints: number | null,
  deltaMs: number,
): number | null {
  if (currentPoints === null || pastPoints === null) return null;
  if (!deltaMs || deltaMs < MIN_RATE_WINDOW_MS) return null;
  const delta = currentPoints - pastPoints;
  if (delta < 0) return null;
  return delta / (deltaMs / 3_600_000);
}

export function sampleSeriesAt(
  series: SeriesPoint[],
  targetTimestamp: number,
): SeriesPoint | null {
  if (series.length === 0) return null;

  let previous: SeriesPoint | null = null;
  for (const point of series) {
    if (point.timestamp === targetTimestamp) return point;

    if (point.timestamp > targetTimestamp) {
      if (!previous) return point;
      const span = point.timestamp - previous.timestamp;
      if (span <= 0) return previous;
      const ratio = (targetTimestamp - previous.timestamp) / span;
      return {
        timestamp: targetTimestamp,
        value:
          previous.value +
          (point.value - previous.value) * Math.min(1, Math.max(0, ratio)),
      };
    }

    previous = point;
  }

  return previous;
}

export function calculatePph(
  series: SeriesPoint[],
  windowMs = DEFAULT_PPH_WINDOW_MS,
): number | null {
  if (series.length < 2) return null;
  const latest = series[series.length - 1];
  const base = sampleSeriesAt(series, latest.timestamp - windowMs);
  if (!base) return null;
  return estimateRate(latest.value, base.value, latest.timestamp - base.timestamp);
}

/**
 * Pace for catch-up ETA: prefer ~30m (responsive), then 60m, then short burst.
 * Display PPH can stay on the hour window; ETA should track the live race.
 */
export function preferredPacePph(series: SeriesPoint[]): number | null {
  const windows = [
    30 * 60 * 1000,
    DEFAULT_PPH_WINDOW_MS,
    15 * 60 * 1000,
  ];
  for (const windowMs of windows) {
    const rate = calculatePph(series, windowMs);
    if (rate != null) return rate;
  }
  return null;
}

export function calculateInactiveMs(
  history: PointSample[],
  stopOnGain = true,
): number {
  if (history.length < 2) return 0;

  let inactiveMs = 0;
  for (let i = history.length - 1; i > 0; i -= 1) {
    const current = history[i].points;
    const previous = history[i - 1].points;
    if (current > previous) {
      if (stopOnGain) break;
      continue;
    }
    const elapsed = history[i].timestamp - history[i - 1].timestamp;
    if (elapsed > 0) inactiveMs += elapsed;
  }
  return inactiveMs;
}

export function calculateTotalInactiveMs(history: PointSample[]): number {
  return calculateInactiveMs(history, false);
}

export function calculatePeakStreakMs(history: PointSample[]): number {
  if (history.length < 2) return 0;

  let currentMs = 0;
  let peakMs = 0;

  for (let i = 1; i < history.length; i += 1) {
    const current = history[i].points;
    const previous = history[i - 1].points;
    if (current > previous) {
      const elapsed = history[i].timestamp - history[i - 1].timestamp;
      if (elapsed > 0) currentMs += elapsed;
      peakMs = Math.max(peakMs, currentMs);
    } else {
      currentMs = 0;
    }
  }

  return peakMs;
}

export function findSnapshotAtOrBefore(
  series: SeriesPoint[],
  targetTimestamp: number,
): SeriesPoint | null {
  return sampleSeriesAt(series, targetTimestamp);
}

export function deltaAtWindow(series: SeriesPoint[], windowMs: number): number | null {
  if (series.length === 0 || windowMs <= 0) return null;
  const latest = series[series.length - 1];
  const base = sampleSeriesAt(series, latest.timestamp - windowMs);
  if (!base) return null;
  const delta = latest.value - base.value;
  return Number.isFinite(delta) ? delta : null;
}

export function buildCleanPointsSeries(raw: SeriesPoint[]): SeriesPoint[] {
  const cleaned: SeriesPoint[] = [];
  let maxAllowed = Infinity;
  for (let i = raw.length - 1; i >= 0; i -= 1) {
    if (raw[i].value <= maxAllowed) {
      cleaned.unshift(raw[i]);
      maxAllowed = raw[i].value;
    }
  }
  return cleaned;
}

export function buildRankSeries(
  snapshots: Array<{ timestamp: number; rank: number | null }>,
): SeriesPoint[] {
  const series: SeriesPoint[] = [];
  let last: number | null = null;
  for (const snap of snapshots) {
    if (typeof snap.rank === "number" && snap.rank > 0) last = snap.rank;
    if (last !== null) series.push({ timestamp: snap.timestamp, value: last });
  }
  return series;
}

