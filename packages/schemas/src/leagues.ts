import { z } from "zod";

export const LeagueEntrySchema = z.object({
  name: z.string(),
  rank: z.number().nullable(),
  points: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  contributorCount: z.number().nullable(),
  isOurs: z.boolean(),
});

export const LeaguesResponseSchema = z.object({
  generatedAt: z.number(),
  tracked: z.array(LeagueEntrySchema),
  top100: z.array(LeagueEntrySchema),
});

export type LeagueEntry = z.infer<typeof LeagueEntrySchema>;
export type LeaguesResponse = z.infer<typeof LeaguesResponseSchema>;
