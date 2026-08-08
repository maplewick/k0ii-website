import { z } from "zod";
import { SeriesPointSchema } from "./roster";

export const GraphClanSchema = z.object({
  name: z.string(),
  isOurs: z.boolean(),
  iconUrl: z.string().nullable(),
  pointsSeries: z.array(SeriesPointSchema),
  rankSeries: z.array(SeriesPointSchema),
  latestPoints: z.number().nullable(),
  latestRank: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
});

export const GraphsResponseSchema = z.object({
  generatedAt: z.number(),
  battleId: z.string().nullable(),
  hours: z.number(),
  clans: z.array(GraphClanSchema),
});

export type GraphsResponse = z.infer<typeof GraphsResponseSchema>;
