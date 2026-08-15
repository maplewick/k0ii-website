import type { LeaderboardsResponse } from "@k0ii/schemas";
import type { Env } from "../env";
import { prisma } from "../lib/prisma";
import { ps99ImageUrl } from "./ps99-client";
import { buildCleanPointsSeries, calculatePph, preferredPacePph } from "./stats";

export async function buildLeaderboardsResponse(
  env: Env,
): Promise<LeaderboardsResponse> {
  const now = Date.now();
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
    return { generatedAt: now, battleId: null, battleLive: false, clans: [] };
  }

  const latest = await prisma.clanBattleSnapshot.findFirst({
    where: { battleId: battle.id },
    orderBy: { capturedAt: "desc" },
  });
  if (!latest) {
    return {
      generatedAt: now,
      battleId: battle.id,
      battleLive: battle.state === "live",
      clans: [],
    };
  }

  const snaps = await prisma.clanBattleSnapshot.findMany({
    where: { battleId: battle.id, capturedAt: latest.capturedAt },
    orderBy: { rank: "asc" },
    take: 50,
    include: { clan: true },
  });

  // Prefer last wide (full-ladder) capture so windowed ticks don't shrink top-50.
  let boardSnaps = snaps;
  if (snaps.length < 40) {
    const recentCaptures = await prisma.clanBattleSnapshot.groupBy({
      by: ["capturedAt"],
      where: { battleId: battle.id },
      _count: { _all: true },
      orderBy: { capturedAt: "desc" },
      take: 12,
    });
    const wideAt = recentCaptures.find((c) => c._count._all >= 40)?.capturedAt;
    if (wideAt) {
      boardSnaps = await prisma.clanBattleSnapshot.findMany({
        where: { battleId: battle.id, capturedAt: wideAt },
        orderBy: { rank: "asc" },
        take: 50,
        include: { clan: true },
      });
    }
  }

  const clanIds = boardSnaps.map((s) => s.clanId);
  const seriesRaw = clanIds.length
    ? await prisma.clanBattleSnapshot.findMany({
        where: { battleId: battle.id, clanId: { in: clanIds } },
        orderBy: { capturedAt: "asc" },
      })
    : [];

  const seriesByClan = new Map<string, Array<{ timestamp: number; value: number }>>();
  for (const s of seriesRaw) {
    const list = seriesByClan.get(s.clanId) ?? [];
    list.push({ timestamp: s.capturedAt.getTime(), value: Number(s.battlePoints) });
    seriesByClan.set(s.clanId, list);
  }

  const msRemaining =
    battle.state === "live" && battle.endTime && battle.endTime.getTime() > now
      ? battle.endTime.getTime() - now
      : null;

  const clans = boardSnaps.map((snap, index) => {
    const series = buildCleanPointsSeries(seriesByClan.get(snap.clanId) ?? []);
    const points = Number(snap.battlePoints);
    const next = boardSnaps[index - 1];
    const gapToNext = next ? Math.max(0, Number(next.battlePoints) - points + 1) : null;
    const pph = preferredPacePph(series) ?? calculatePph(series);
    const nextSeries = next
      ? buildCleanPointsSeries(seriesByClan.get(next.clanId) ?? [])
      : [];
    const nextPph =
      preferredPacePph(nextSeries) ?? calculatePph(nextSeries);
    const relative =
      pph !== null && nextPph !== null ? pph - nextPph : null;
    let etaSeconds: number | null = null;
    if (gapToNext !== null && relative !== null && relative > 0) {
      const seconds = (gapToNext / relative) * 3600;
      if (
        Number.isFinite(seconds) &&
        seconds > 0 &&
        (msRemaining == null ||
          msRemaining <= 0 ||
          seconds * 1000 <= msRemaining)
      ) {
        etaSeconds = seconds;
      }
    }
    return {
      rank: snap.rank ?? index + 1,
      name: snap.clanId,
      points,
      pph,
      memberCount: snap.memberCount,
      contributorCount: snap.contributorCount,
      iconUrl: ps99ImageUrl(snap.clan.iconAssetId),
      medal: null,
      isOurs: snap.clanId === env.CLAN_NAME,
      gapToNext,
      etaSeconds,
    };
  });

  return {
    generatedAt: now,
    battleId: battle.id,
    battleLive: battle.state === "live",
    clans,
  };
}
