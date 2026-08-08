import type { RosterResponse } from "@k0ii/schemas";

import { normalizeSeries, type ClanInput } from "@/lib/analytics/projection";

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
      pph: b?.pph ?? null,
      rank: b?.rank ?? null,
      memberCount: ourMemberCount,
    },
    ...neighbors.map((clan) => ({
      name: clan.name,
      points: Number(clan.points) || 0,
      series: undefined,
      pph: clan.pph ?? null,
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

export function resolveBattleEndsAt(
  battle: RosterResponse["battle"] | null | undefined,
  generatedAt?: number,
): number | null {
  if (!battle) return null;
  if (battle.msRemaining != null && battle.msRemaining > 0) {
    return (generatedAt ?? Date.now()) + battle.msRemaining;
  }
  return null;
}
