import { z } from "zod";

export const GlobalPlayerSchema = z.object({
  rank: z.number(),
  displayName: z.string(),
  robloxUserId: z.string(),
  clanName: z.string().nullable(),
  points: z.number(),
  isOurs: z.boolean(),
});

export const GlobalLeaderboardResponseSchema = z.object({
  generatedAt: z.number(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  players: z.array(GlobalPlayerSchema),
});

export type GlobalPlayer = z.infer<typeof GlobalPlayerSchema>;
export type GlobalLeaderboardResponse = z.infer<typeof GlobalLeaderboardResponseSchema>;
