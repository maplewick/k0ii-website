import { z } from "zod";

export const SeriesPointSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
});

export const ClanNeighborSchema = z.object({
  name: z.string(),
  rank: z.number().nullable(),
  points: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  pointsNeeded: z.number().nullable(),
  relativePPH: z.number().nullable(),
  etaSeconds: z.number().nullable(),
  iconUrl: z.string().nullable(),
  activeMembers: z.number().nullable(),
  activeRosterSize: z.number().nullable(),
  compact: z.boolean().optional(),
});

export const RosterMemberSchema = z.object({
  robloxUserId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.string().nullable(),
  battlePoints: z.number(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  delta30m: z.number().nullable(),
  delta60m: z.number().nullable(),
  delta12h: z.number().nullable(),
  delta24h: z.number().nullable(),
  inactiveMs: z.number().nullable(),
  inactiveTotalMs: z.number().nullable(),
  streakPeakMs: z.number().nullable(),
  avgPlacement: z.number().nullable(),
  contributionPct: z.number().nullable(),
  totalDonatedGems: z.number().nullable(),
  rank: z.number().nullable(),
  series: z.array(SeriesPointSchema).optional(),
});

export const BattleSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  live: z.boolean(),
  rank: z.number().nullable(),
  points: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  msRemaining: z.number().nullable(),
  endedAt: z.number().nullable().optional(),
  memberCount: z.number().nullable(),
  contributorCount: z.number().nullable(),
  kickCooldownEndsAt: z.number().nullable().optional(),
  gapToAbove: z.number().nullable().optional(),
  rankSeries: z.array(SeriesPointSchema).optional(),
  series: z.array(SeriesPointSchema).optional(),
  lastBattleRank: z.number().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
});

export const RosterResponseSchema = z.object({
  generatedAt: z.number(),
  clanName: z.string(),
  battle: BattleSummarySchema.nullable(),
  comparison: z.object({
    aboveClans: z.array(ClanNeighborSchema),
    belowClans: z.array(ClanNeighborSchema),
  }),
  members: z.array(RosterMemberSchema),
});

export type SeriesPoint = z.infer<typeof SeriesPointSchema>;
export type ClanNeighbor = z.infer<typeof ClanNeighborSchema>;
export type RosterMember = z.infer<typeof RosterMemberSchema>;
export type BattleSummary = z.infer<typeof BattleSummarySchema>;
export type RosterResponse = z.infer<typeof RosterResponseSchema>;
