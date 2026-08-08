import { z } from "zod";
import { SeriesPointSchema } from "./roster";

export const BattleArchiveEntrySchema = z.object({
  battleId: z.string(),
  title: z.string().nullable(),
  finalizedAt: z.number(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  ourRank: z.number().nullable(),
  ourPoints: z.number().nullable(),
  medal: z.string().nullable(),
  participantCount: z.number().nullable(),
});

export const BattleArchiveResponseSchema = z.object({
  generatedAt: z.number(),
  battles: z.array(BattleArchiveEntrySchema),
  currentBattleId: z.string().nullable(),
});

export const BattleMemberDetailSchema = z.object({
  robloxUserId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  battlePoints: z.number(),
  contributionPct: z.number().nullable(),
  series: z.array(SeriesPointSchema).optional(),
});

export const BattleDetailSchema = z.object({
  battleId: z.string(),
  title: z.string().nullable(),
  live: z.boolean(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  ourRank: z.number().nullable(),
  ourPoints: z.number().nullable(),
  medal: z.string().nullable(),
  members: z.array(BattleMemberDetailSchema),
});

export type BattleArchiveEntry = z.infer<typeof BattleArchiveEntrySchema>;
export type BattleArchiveResponse = z.infer<typeof BattleArchiveResponseSchema>;
export type BattleMemberDetail = z.infer<typeof BattleMemberDetailSchema>;
export type BattleDetail = z.infer<typeof BattleDetailSchema>;
