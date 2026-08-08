import { normalizeSeries, type SeriesPoint } from "@/lib/analytics/projection";
import type { BattleDetail, RosterMember, RosterResponse } from "@k0ii/schemas";

export const REPLAY_PLAY_MS = 60;
export const REPLAY_PLAY_STEP = 0.4;
export const REPLAY_MAX_ROWS = 25;
export const CLAN_ROSTER_CAPACITY = 75;

export type ReplayMember = {
  name: string;
  userId: string;
  avatarUrl: string | null;
  series: SeriesPoint[];
};

export function humanBattleName(id: string): string {
  return id
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/(\d+)/g, " $1")
    .replace(/\s+/g, " ")
    .trim();
}

export function valueAt(series: SeriesPoint[], t: number): number {
  if (!series.length) return 0;
  const first = series[0]!;
  const last = series[series.length - 1]!;
  if (t <= first.timestamp) return first.value || 0;
  if (t >= last.timestamp) return last.value || 0;
  let lo = 0;
  let hi = series.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (series[mid]!.timestamp <= t) lo = mid;
    else hi = mid;
  }
  const a = series[lo]!;
  const b = series[hi]!;
  const span = b.timestamp - a.timestamp;
  if (span <= 0) return b.value || 0;
  const f = (t - a.timestamp) / span;
  return (a.value || 0) + ((b.value || 0) - (a.value || 0)) * f;
}

export function membersFromBattleDetail(
  detail: BattleDetail | null | undefined,
): ReplayMember[] {
  return (detail?.members ?? [])
    .map((m) => {
      const series = normalizeSeries(m.series);
      if (series.length < 2) return null;
      return {
        name: m.displayName,
        userId: m.robloxUserId,
        avatarUrl: m.avatarUrl,
        series,
      };
    })
    .filter(Boolean) as ReplayMember[];
}

export function membersFromRoster(
  members: RosterMember[] | null | undefined,
): ReplayMember[] {
  return (members ?? [])
    .map((m) => {
      const series = normalizeSeries(m.series);
      if (series.length < 2) return null;
      return {
        name: m.displayName,
        userId: m.robloxUserId,
        avatarUrl: m.avatarUrl,
        series,
      };
    })
    .filter(Boolean) as ReplayMember[];
}

export function resolveBattleTimeRange(
  members: ReplayMember[],
  startedAt?: number | null,
  endedAt?: number | null,
): { tStart: number; tEnd: number } {
  let seriesStart = Infinity;
  let seriesEnd = -Infinity;
  for (const m of members) {
    seriesStart = Math.min(seriesStart, m.series[0]!.timestamp);
    seriesEnd = Math.max(seriesEnd, m.series[m.series.length - 1]!.timestamp);
  }

  const tStart =
    startedAt != null && Number.isFinite(startedAt) ? startedAt : seriesStart;
  let tEnd =
    endedAt != null && Number.isFinite(endedAt) ? endedAt : seriesEnd;

  if (endedAt == null || !Number.isFinite(endedAt)) {
    tEnd = seriesEnd > 0 ? seriesEnd : Date.now();
  }

  if (!Number.isFinite(tStart) || !Number.isFinite(tEnd) || tEnd <= tStart) {
    return { tStart: 0, tEnd: 0 };
  }
  return { tStart, tEnd };
}

export function resolveRosterCapacity(
  battle: RosterResponse["battle"] | null | undefined,
): number {
  const cap = Number(battle?.memberCount);
  if (Number.isFinite(cap) && cap > 50) return cap;
  return CLAN_ROSTER_CAPACITY;
}
