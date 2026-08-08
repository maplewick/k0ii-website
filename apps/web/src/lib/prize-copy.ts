/**
 * Web helpers for clan prize pool.
 * Edit amounts / bands in `@k0ii/schemas` → `prize-pool.ts` (single source of truth).
 */

export {
  CLAN_BATTLE_GIVEAWAY,
  CLAN_BATTLE_PODIUM,
  joinPrizeLines,
  type ClanGiveaway,
  type ClanGiveawayTier,
  type ClanPodiumPrize,
  type PrizeCurrency,
} from "@k0ii/schemas";

import {
  CLAN_BATTLE_GIVEAWAY,
  CLAN_BATTLE_PODIUM,
  type ClanGiveaway,
  type ClanPodiumPrize,
} from "@k0ii/schemas";

export function clanBattlePodiumDisplay(): ClanPodiumPrize[] {
  return CLAN_BATTLE_PODIUM.map((p) => ({
    ...p,
    prizes: [...p.prizes],
  }));
}

export function clanBattleGiveawayDisplay(): ClanGiveaway {
  return {
    ...CLAN_BATTLE_GIVEAWAY,
    tiers: CLAN_BATTLE_GIVEAWAY.tiers.map((t) => ({
      ...t,
      rewards: [...t.rewards],
    })),
  };
}
