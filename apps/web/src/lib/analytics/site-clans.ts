import type { RosterResponse } from "@k0ii/schemas";

import { normalizeSeries, type ClanInput } from "@/lib/analytics/projection";

function neighborPph(clan: {
  pph?: number | null;
  delta5m?: number | null;
}): number | null {
  if (Number.isFinite(Number(clan.pph))) return Number(clan.pph);
  if (Number.isFinite(Number(clan.delta5m))) return Number(clan.delta5m) * 12;
  return null;
}

/** Collect clan ladder inputs for projection from roster payload. */
export function collectClans(data: RosterResponse): ClanInput[] {
  const b = data.battle;
  const ourMemberCount = Number.isFinite(Number(b?.memberCount))
    ? Number(b?.memberCount)
    : data.members.length;

  const neighbors = [...data.comparison.aboveClans, ...data.comparison.belowClans];

  const raw: ClanInput[] = [
    {
      name: data.clanName,
      points: Number(b?.points) || 0,
      series: normalizeSeries(b?.series),
      pph: b?.pph ?? (b?.delta5m != null ? Number(b.delta5m) * 12 : null),
      rank: b?.rank ?? null,
      memberCount: ourMemberCount,
    },
    ...neighbors
      .filter((clan) => Number.isFinite(Number(clan.points)))
      .map((clan) => ({
        name: clan.name,
        points: Number(clan.points),
        series: normalizeSeries(clan.series),
        pph: neighborPph(clan),
        rank: clan.rank ?? null,
        memberCount:
          clan.activeRosterSize != null && clan.activeRosterSize > 0
            ? clan.activeRosterSize
            : null,
      })),
  ];

  const seen = new Set<string>();
  const out: ClanInput[] = [];
  for (const clan of raw) {
    const key = clan.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clan);
  }
  return out;
}

/**
 * Absolute battle end timestamp for projections / countdown.
 * Prefer endsAt; else generatedAt + msRemaining. No invented soft windows.
 */
export function resolveBattleEndsAt(
  battle: RosterResponse["battle"] | null | undefined,
  generatedAt?: number,
): number | null {
  if (!battle) return null;
  const endsAt = Number(battle.endsAt);
  if (Number.isFinite(endsAt) && endsAt > 0) return endsAt;
  if (battle.msRemaining != null && battle.msRemaining > 0) {
    return (generatedAt ?? Date.now()) + battle.msRemaining;
  }
  return null;
}

/** Remaining ms until battle end (clamped). Null if end unknown. */
export function battleMsRemaining(
  battle: RosterResponse["battle"] | null | undefined,
  generatedAt?: number,
  now = Date.now(),
): number | null {
  const endsAt = resolveBattleEndsAt(battle, generatedAt);
  if (endsAt == null) return null;
  const left = endsAt - now;
  return left > 0 ? left : null;
}
