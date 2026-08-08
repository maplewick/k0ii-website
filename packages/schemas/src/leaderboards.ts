import { z } from "zod";

export const LeaderboardClanSchema = z.object({
  rank: z.number(),
  name: z.string(),
  points: z.number(),
  pph: z.number().nullable(),
  memberCount: z.number().nullable(),
  contributorCount: z.number().nullable(),
  iconUrl: z.string().nullable(),
  medal: z.string().nullable(),
  isOurs: z.boolean(),
  gapToNext: z.number().nullable(),
  etaSeconds: z.number().nullable(),
});

export const LeaderboardsResponseSchema = z.object({
  generatedAt: z.number(),
  battleId: z.string().nullable(),
  battleLive: z.boolean(),
  clans: z.array(LeaderboardClanSchema),
});

export type LeaderboardClan = z.infer<typeof LeaderboardClanSchema>;
export type LeaderboardsResponse = z.infer<typeof LeaderboardsResponseSchema>;
