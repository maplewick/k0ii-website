import {
  FORECAST_HORIZONS,
  pickHorizon,
  type ForecastPoint,
} from "./arima";
import type { SeriesPoint } from "./poisson";

export type Competitor = {
  id: string;
  label: string;
  points: number;
  /** Points per hour. Used when series is too short for ARIMA. */
  pph?: number | null;
  series?: SeriesPoint[] | null;
};

export type RankAtHorizon = {
  hours: number;
  rank: number;
  /** Best (lowest) rank across our 95% high points vs rivals' medians. */
  bestRank: number;
  /** Worst (highest) rank across our 95% low points vs rivals' medians. */
  worstRank: number;
  fieldSize: number;
};

const MAX_COMPETITORS = 80;

function projectLinear(points: number, pph: number, hours: number): number {
  return Math.max(0, points) + Math.max(0, pph) * hours;
}

/** Projected points at `hours` using current pace (constant PPH). */
export function projectCompetitorPoints(
  competitor: Competitor,
  hours: number,
): number {
  return projectLinear(
    competitor.points,
    Number(competitor.pph) || 0,
    hours,
  );
}

function rankAmong(
  ourPoints: number,
  rivalPoints: number[],
): number {
  let better = 0;
  for (const pts of rivalPoints) {
    if (pts > ourPoints) better += 1;
  }
  return better + 1;
}

/**
 * Project placement at each forecast horizon.
 * Lower rank is better (1 = first).
 */
export function forecastRanks(args: {
  ourForecast: ForecastPoint[];
  competitors: Competitor[];
  /** Exclude this id from the field (ourselves). */
  selfId?: string;
  horizons?: readonly number[];
}): RankAtHorizon[] {
  const horizons = args.horizons ?? FORECAST_HORIZONS;
  const field = args.competitors
    .filter((c) => c.id && c.id !== args.selfId)
    .filter((c) => Number.isFinite(c.points))
    .slice(0, MAX_COMPETITORS);

  // Precompute rival medians per horizon (avoid re-fitting inside loops).
  const rivalByHour = new Map<number, number[]>();
  for (const h of horizons) {
    rivalByHour.set(
      h,
      field.map((c) => projectCompetitorPoints(c, h)),
    );
  }

  return horizons.map((hours) => {
    const ours = pickHorizon(args.ourForecast, hours);
    const rivals = rivalByHour.get(hours) ?? [];
    const fieldSize = rivals.length + 1;
    if (!ours) {
      return {
        hours,
        rank: fieldSize,
        bestRank: fieldSize,
        worstRank: fieldSize,
        fieldSize,
      };
    }
    return {
      hours,
      rank: rankAmong(ours.median, rivals),
      bestRank: rankAmong(ours.high95, rivals),
      worstRank: rankAmong(ours.low95, rivals),
      fieldSize,
    };
  });
}

/** Build clan competitors from topClans + neighbor cards. */
export function buildClanCompetitors(args: {
  topClans?: Array<{
    clanName?: string | null;
    name?: string | null;
    points?: number | null;
    pointsPer5m?: number | null;
    rank?: number | null;
  }> | null;
  neighbors?: Array<{
    name?: string | null;
    clanName?: string | null;
    points?: number | null;
    pph?: number | null;
    series?: SeriesPoint[] | null;
  }> | null;
  selfName?: string | null;
}): Competitor[] {
  const map = new Map<string, Competitor>();
  const self = String(args.selfName ?? "")
    .trim()
    .toLowerCase();

  const ingest = (c: Competitor) => {
    const key = c.id.toLowerCase();
    if (!key || (self && key === self)) return;
    const prev = map.get(key);
    if (!prev || (c.series?.length ?? 0) > (prev.series?.length ?? 0)) {
      map.set(key, c);
    } else if (prev && c.pph != null && prev.pph == null) {
      map.set(key, { ...prev, pph: c.pph });
    }
  };

  for (const clan of args.topClans ?? []) {
    const label = String(clan.clanName ?? clan.name ?? "").trim();
    if (!label) continue;
    const per5 = Number(clan.pointsPer5m);
    const pph = Number.isFinite(per5) ? per5 * 12 : null;
    ingest({
      id: label,
      label,
      points: Number(clan.points) || 0,
      pph,
    });
  }

  for (const n of args.neighbors ?? []) {
    const label = String(n.name ?? n.clanName ?? "").trim();
    if (!label) continue;
    ingest({
      id: label,
      label,
      points: Number(n.points) || 0,
      pph: n.pph,
      series: n.series,
    });
  }

  return [...map.values()].sort((a, b) => b.points - a.points);
}

/** Build in-clan competitors from roster members. */
export function buildMemberCompetitors(
  members: Array<{
    roblox_id?: string | number | null;
    roblox_username?: string | null;
    currentPoints?: number | null;
    pph?: number | null;
    series?: SeriesPoint[] | null;
  }>,
  selfUsername?: string | null,
): Competitor[] {
  const self = String(selfUsername ?? "")
    .trim()
    .toLowerCase();
  return members
    .map((m) => {
      const label = String(m.roblox_username ?? "").trim();
      const id = String(m.roblox_id ?? label);
      return {
        id,
        label,
        points: Number(m.currentPoints) || 0,
        pph: m.pph,
        series: m.series,
      } satisfies Competitor;
    })
    .filter((c) => c.label && c.label.toLowerCase() !== self)
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_COMPETITORS);
}

export function formatRank(rank: number | null | undefined): string {
  if (rank == null || !Number.isFinite(rank)) return "-";
  return `#${Math.round(rank)}`;
}

/** 1 → 1st, 2 → 2nd, 3 → 3rd, … */
export function formatOrdinal(rank: number | null | undefined): string {
  if (rank == null || !Number.isFinite(rank)) return "-";
  const v = Math.round(rank);
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`;
  switch (v % 10) {
    case 1:
      return `${v}st`;
    case 2:
      return `${v}nd`;
    case 3:
      return `${v}rd`;
    default:
      return `${v}th`;
  }
}

/** Typical PS99 clan battle length (matches legacy website countdown). */
export const BATTLE_DURATION_MS = 24 * 60 * 60 * 1000;

export function battleHoursLeft(
  battleStartedAt: number | null | undefined,
  now = Date.now(),
): number | null {
  if (battleStartedAt == null || !Number.isFinite(battleStartedAt)) return null;
  const end = battleStartedAt + BATTLE_DURATION_MS;
  return Math.max(0, (end - now) / 3_600_000);
}

/**
 * Horizon for finish projection. Live wars keep projecting even if the
 * nominal 24h clock expired (PS99 wars can run longer / restart mid-window).
 */
export function projectionHorizonHours(args: {
  battleStartedAt?: number | null;
  live?: boolean | null;
  now?: number;
}): number {
  const clock = battleHoursLeft(args.battleStartedAt, args.now);
  if (args.live) {
    if (clock != null && clock > 0.5) return Math.min(24, clock);
    return 12;
  }
  if (clock == null) return 24;
  return clock;
}

export type FinishOddsBin = {
  rank: number;
  count: number;
  pct: number;
};

/**
 * Monte Carlo finish-place histogram: our terminal sims vs linear rival pace.
 */
export function finishRankOdds(args: {
  terminalValues: number[];
  competitors: Competitor[];
  hours: number;
  selfId?: string;
}): FinishOddsBin[] {
  const field = args.competitors
    .filter((c) => c.id && c.id !== args.selfId)
    .filter((c) => Number.isFinite(c.points))
    .slice(0, MAX_COMPETITORS);
  const rivalEnds = field.map((c) => projectCompetitorPoints(c, args.hours));
  const fieldSize = rivalEnds.length + 1;
  const counts = new Array<number>(fieldSize + 1).fill(0);
  const n = args.terminalValues.length;
  if (n === 0) return [];

  for (const ours of args.terminalValues) {
    const r = rankAmong(ours, rivalEnds);
    counts[r] = (counts[r] ?? 0) + 1;
  }

  const bins: FinishOddsBin[] = [];
  for (let r = 1; r <= fieldSize; r++) {
    const count = counts[r] ?? 0;
    if (count === 0) continue;
    bins.push({ rank: r, count, pct: count / n });
  }
  return bins;
}

/** PPH we need above rival to close the gap by `hoursLeft`. */
export function catchUpRate(args: {
  ourPoints: number;
  ourPph: number;
  rivalPoints: number;
  rivalPph: number;
  hoursLeft: number;
}): { gap: number; neededExtraPph: number; catching: boolean } | null {
  const h = Math.max(0.25, args.hoursLeft);
  const ourEnd = args.ourPoints + Math.max(0, args.ourPph) * h;
  const rivalEnd = args.rivalPoints + Math.max(0, args.rivalPph) * h;
  const gap = args.rivalPoints - args.ourPoints;
  // Extra rate vs current needed so ourEnd == rivalEnd
  const neededExtraPph =
    (args.rivalPoints - args.ourPoints) / h +
    Math.max(0, args.rivalPph) -
    Math.max(0, args.ourPph);
  return {
    gap,
    neededExtraPph,
    catching: ourEnd >= rivalEnd,
  };
}
