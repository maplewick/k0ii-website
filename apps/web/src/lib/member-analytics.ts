import type { RosterMember, SeriesPoint } from "@k0ii/schemas";

const HOUR_MS = 3_600_000;
const MIN_RATE_WINDOW_MS = 4 * 60 * 1000;
const PPH_WINDOW_MS = HOUR_MS;

function sampleSeriesAt(
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

/** Rolling 1h PPH series — matches API `calculatePph` window. */
export function derivePphSeries(series: SeriesPoint[]): SeriesPoint[] {
  if (series.length < 2) return [];
  const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);
  const out: SeriesPoint[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const slice = sorted.slice(0, i + 1);
    const latest = slice[slice.length - 1]!;
    const base = sampleSeriesAt(slice, latest.timestamp - PPH_WINDOW_MS);
    if (!base) continue;
    const deltaMs = latest.timestamp - base.timestamp;
    if (deltaMs < MIN_RATE_WINDOW_MS) continue;
    const delta = latest.value - base.value;
    if (delta < 0) continue;
    out.push({
      timestamp: latest.timestamp,
      value: delta / (deltaMs / HOUR_MS),
    });
  }

  return out;
}

export function contributionPct(
  member: RosterMember,
  clanTotal: number | null | undefined,
): number | null {
  if (clanTotal == null || clanTotal <= 0) return null;
  return (member.battlePoints / clanTotal) * 100;
}

export function clanAveragePph(members: RosterMember[]): number | null {
  const values = members
    .map((m) => m.pph)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function findRosterNeighbors(
  members: RosterMember[],
  member: RosterMember,
): { above: RosterMember | null; below: RosterMember | null } {
  const sorted = [...members].sort((a, b) => b.battlePoints - a.battlePoints);
  const idx = sorted.findIndex((m) => m.robloxUserId === member.robloxUserId);
  if (idx < 0) return { above: null, below: null };
  return {
    above: idx > 0 ? sorted[idx - 1]! : null,
    below: idx < sorted.length - 1 ? sorted[idx + 1]! : null,
  };
}

export function pointsGapTo(
  member: RosterMember,
  rival: RosterMember | null,
): number | null {
  if (!rival) return null;
  return rival.battlePoints - member.battlePoints;
}

export function peakDelta(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);
  let best = 0;
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i]!.value - sorted[i - 1]!.value;
    if (delta > best) best = delta;
  }
  return best > 0 ? best : null;
}
