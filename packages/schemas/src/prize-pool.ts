/**
 * Clan battle prize pool — single source of truth for API + web.
 * Edit amounts / giveaway bands here; UI and `/api/battle-rewards` follow.
 *
 * Multiple rewards: put several strings in `prizes` / `rewards`.
 * Example: prizes: ["2,500 Robux", "Huge pet"]
 */

export type PrizeCurrency = "gems" | "robux";

export type ClanPodiumPrize = {
  place: string;
  /** One or more prize lines for this place (stacked in UI). */
  prizes: readonly string[];
  /** Primary currency for accent / filtering. */
  currency: PrizeCurrency;
  featured: boolean;
};

export type ClanGiveawayTier = {
  places: string;
  /**
   * One or more reward lines — prize names, or odds like "~9.1% odds each"
   * if you use the weighted odds UI.
   */
  rewards: readonly string[];
};

export type ClanGiveaway = {
  /** Short label on the giveaway card (e.g. "4th-35th"). */
  placesLabel: string;
  title: string;
  description: string;
  tiers: ClanGiveawayTier[];
};

/** Join prize lines for compact single-string display. */
export function joinPrizeLines(lines: readonly string[]): string {
  return lines.filter(Boolean).join(" + ");
}

/** Top-3 clan payouts (Robux / gems). Add more strings to `prizes` for extras. */
export const CLAN_BATTLE_PODIUM: readonly ClanPodiumPrize[] = [
  {
    place: "1st",
    prizes: ["2,500 Robux", "Rainbow Titanic"],
    currency: "robux",
    featured: true,
  },
  {
    place: "2nd",
    prizes: ["1,250 Robux", "Golden Titanic"],
    currency: "robux",
    featured: false,
  },
  {
    place: "3rd",
    prizes: ["500 Robux", "Normal Titanic"],
    currency: "robux",
    featured: false,
  },
];

/** Member giveaway bands below podium. Add more strings to `rewards` for extras. */
export const CLAN_BATTLE_GIVEAWAY: ClanGiveaway = {
  placesLabel: "4th-35th",
  title: "Member giveaways",
  description:
    "4th-20th enter the Titanic Koi Fish giveaway. 21st-35th enter a second ~4b Titanic giveaway.",
  tiers: [
    { places: "4th-20th", rewards: ["Titanic Koi Fish Giveaway"] },
    { places: "21st-35th", rewards: ["~4b Titanic Giveaway"] },
  ],
};
