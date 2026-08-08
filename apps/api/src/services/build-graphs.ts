import type { GraphsResponse } from "@k0ii/schemas";
import type { Env } from "../env";
import { prisma } from "../lib/prisma";
import { ps99ImageUrl } from "./ps99-client";
import {
  buildCleanPointsSeries,
  buildRankSeries,
  calculatePph,
  deltaAtWindow,
} from "./stats";

const FIVE_MIN_MS = 5 * 60 * 1000;

export async function buildGraphsResponse(
  env: Env,
  hours = 12,
): Promise<GraphsResponse> {
  const now = Date.now();
  const clampedHours = Math.min(48, Math.max(1, hours));
  const since = new Date(now - clampedHours * 60 * 60 * 1000);

  const battle =
    (await prisma.battle.findFirst({
      where: { state: "live" },
      orderBy: { updatedAt: "desc" },
    })) ??
    (await prisma.battle.findFirst({
      where: { state: "past" },
      orderBy: { endTime: "desc" },
    }));

  if (!battle) {
    return { generatedAt: now, battleId: null, hours: clampedHours, clans: [] };
  }

  const latest = await prisma.clanBattleSnapshot.findFirst({
    where: { battleId: battle.id },
    orderBy: { capturedAt: "desc" },
  });
  if (!latest) {
    return { generatedAt: now, battleId: battle.id, hours: clampedHours, clans: [] };
  }

  const latestSnaps = await prisma.clanBattleSnapshot.findMany({
    where: { battleId: battle.id, capturedAt: latest.capturedAt },
    orderBy: { rank: "asc" },
  });

  const ourIndex = latestSnaps.findIndex((s) => s.clanId === env.CLAN_NAME);
  const focusStart = Math.max(0, (ourIndex >= 0 ? ourIndex : 0) - 10);
  const focus = latestSnaps.slice(focusStart, focusStart + 21);
  if (!focus.some((s) => s.clanId === env.CLAN_NAME)) {
    const ours = latestSnaps.find((s) => s.clanId === env.CLAN_NAME);
    if (ours) focus.unshift(ours);
  }

  const focusIds = focus.map((s) => s.clanId);
  const [clanRows, seriesRaw] = await Promise.all([
    focusIds.length
      ? prisma.clan.findMany({ where: { id: { in: focusIds } } })
      : Promise.resolve([]),
    focusIds.length
      ? prisma.clanBattleSnapshot.findMany({
          where: {
            battleId: battle.id,
            clanId: { in: focusIds },
            capturedAt: { gte: since },
          },
          orderBy: { capturedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const iconByClan = new Map(clanRows.map((c) => [c.id, c.iconAssetId]));
  const seriesByClan = new Map<
    string,
    Array<{ timestamp: number; points: number; rank: number | null }>
  >();
  for (const s of seriesRaw) {
    const list = seriesByClan.get(s.clanId) ?? [];
    list.push({
      timestamp: s.capturedAt.getTime(),
      points: Number(s.battlePoints),
      rank: s.rank,
    });
    seriesByClan.set(s.clanId, list);
  }

  const clans = focus.map((snap) => {
    const raw = seriesByClan.get(snap.clanId) ?? [];
    const pointsSeries = buildCleanPointsSeries(
      raw.map((s) => ({ timestamp: s.timestamp, value: s.points })),
    );
    const rankSeries = buildRankSeries(
      raw.map((s) => ({ timestamp: s.timestamp, rank: s.rank })),
    );
    return {
      name: snap.clanId,
      isOurs: snap.clanId === env.CLAN_NAME,
      iconUrl: ps99ImageUrl(iconByClan.get(snap.clanId) ?? null),
      pointsSeries,
      rankSeries,
      latestPoints: Number(snap.battlePoints),
      latestRank: snap.rank,
      pph: calculatePph(pointsSeries),
      delta5m: deltaAtWindow(pointsSeries, FIVE_MIN_MS),
    };
  });

  return {
    generatedAt: now,
    battleId: battle.id,
    hours: clampedHours,
    clans,
  };
}
