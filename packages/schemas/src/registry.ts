import { z } from "zod";

export const RegistryBattleEntrySchema = z.object({
  battleId: z.string(),
  points: z.number(),
  rank: z.number(),
  total: z.number(),
  clanPlace: z.number().nullable(),
  active: z.boolean(),
});

export const RegistryResponseSchema = z.object({
  generatedAt: z.number(),
  avatars: z.record(z.string(), z.string().nullable()),
  battleHistory: z.record(z.string(), z.array(RegistryBattleEntrySchema)),
});

export type RegistryBattleEntry = z.infer<typeof RegistryBattleEntrySchema>;
export type RegistryResponse = z.infer<typeof RegistryResponseSchema>;
