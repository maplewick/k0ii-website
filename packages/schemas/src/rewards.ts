import { z } from "zod";

export const PlacementRewardSchema = z.object({
  place: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      imageUrl: z.string().nullable(),
      variant: z.string().nullable(),
    }),
  ),
});

export const PodiumPrizeSchema = z.object({
  place: z.string(),
  /** One or more prize lines for this place. */
  prizes: z.array(z.string()).min(1),
  currency: z.enum(["gems", "robux"]),
  featured: z.boolean(),
});

export const BattleRewardsResponseSchema = z.object({
  generatedAt: z.number(),
  battleId: z.string().nullable(),
  battleTitle: z.string().nullable(),
  podium: z.array(PodiumPrizeSchema),
  placementRewards: z.array(PlacementRewardSchema),
  giveaway: z.object({
    placesLabel: z.string().optional(),
    title: z.string(),
    description: z.string(),
    tiers: z.array(
      z.object({
        places: z.string(),
        /** One or more reward / odds lines. */
        rewards: z.array(z.string()).min(1),
      }),
    ),
  }),
});

export type BattleRewardsResponse = z.infer<typeof BattleRewardsResponseSchema>;
