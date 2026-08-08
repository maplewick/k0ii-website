import type { RosterResponse } from "@k0ii/schemas";
import type { ClanBattleSnapshot, ClanMembership, PlayerPointSnapshot } from "@prisma/client";
import type { Env } from "../env";
import { bigIntToNumber, prisma, userIdToString } from "../lib/prisma";
import { selectComparisonClans } from "./comparison";
import { ps99ImageUrl } from "./ps99-client";
import {
  buildCleanPointsSeries,
  buildRankSeries,
  calculateInactiveMs,
  calculatePeakStreakMs,
  calculatePph,
  calculateTotalInactiveMs,
  deltaAtWindow,
} from "./stats";

const HOUR_MS = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;
const KICK_COOLDOWN_MS = 24 * HOUR_MS;

export async function buildRosterResponse(env: Env): Promise<RosterResponse> {
  const now = Date.now();
  const empty: RosterResponse = {
    generatedAt: now,
    clanName: env.CLAN_NAME,
    battle: null,
    comparison: { aboveClans: [], belowClans: [] },
    members: [],
  };

  const liveBattle = await prisma.battle.findFirst({
    where: { state: "live" },
    orderBy: { updatedAt: "desc" },
  });
  const battle =
    liveBattle ??
    (await prisma.battle.findFirst({
      where: { state: "past" },
      orderBy: { endTime: "desc" },
    }));
  if (!battle) return empty;

  const battleId = battle.id;
  const ourClanName = env.CLAN_NAME;

  const latestClanSnapshots: ClanBattleSnapshot[] = await prisma.clanBattleSnapshot.findMany({
    where: { battleId },
    orderBy: { capturedAt: "desc" },
    take: 500,
  });

  const latestCapture = latestClanSnapshots[0]?.capturedAt ?? null;
  const snapshotAtLatest = latestCapture
    ? latestClanSnapshots
        .filter((s) => s.capturedAt.getTime() === latestCapture.getTime())
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    : [];

  const ourSnapshot = snapshotAtLatest.find((s) => s.clanId === ourClanName) ?? null;
  const isLive = battle.state === "live";

  // Live battle with no ladder snaps yet (PS99 topClans empty) — still surface the war.
  if (!ourSnapshot) {
    if (!isLive) return empty;

    const membershipsEarly = await prisma.clanMembership.findMany({
      where: { clanId: ourClanName },
      include: { player: true },
    });
    const ourClanEarly = await prisma.clan.findUnique({
      where: { id: ourClanName },
    });
    const msRemainingEarly =
      battle.endTime && battle.endTime.getTime() > now
        ? battle.endTime.getTime() - now
        : null;

    return {
      generatedAt: now,
      clanName: ourClanName,
      battle: {
        id: battleId,
        title: battle.title,
        live: true,
        rank: null,
        points: 0,
        pph: null,
        delta5m: null,
        msRemaining: msRemainingEarly,
        endedAt: null,
        memberCount: membershipsEarly.length,
        contributorCount: 0,
        kickCooldownEndsAt: null,
        gapToAbove: null,
        rankSeries: [],
        series: [],
        lastBattleRank: null,
        iconUrl: ps99ImageUrl(ourClanEarly?.iconAssetId ?? null),
      },
      comparison: { aboveClans: [], belowClans: [] },
      members: membershipsEarly
        .map((m) => ({
          robloxUserId: userIdToString(m.robloxUserId),
          displayName: m.player.displayName,
          avatarUrl: m.player.avatarUrl,
          role:
            m.permissionLevel >= 255
              ? "Owner"
              : m.permissionLevel >= 90
                ? "Officer"
                : "Member",
          battlePoints: 0,
          pph: null,
          delta5m: null,
          delta30m: null,
          delta60m: null,
          delta12h: null,
          delta24h: null,
          inactiveMs: null,
          inactiveTotalMs: null,
          streakPeakMs: null,
          avgPlacement: null,
          contributionPct: null,
          totalDonatedGems: null,
          rank: null as number | null,
          series: [],
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((member, index) => ({ ...member, rank: index + 1 })),
    };
  }

  const window = snapshotAtLatest.map((s) => ({
    name: s.clanId,
    rank: s.rank,
    points: bigIntToNumber(s.battlePoints),
    icon: s.clanId,
  }));

  const currentIndex = window.findIndex((e) => e.name === ourClanName);
  const { aboveClans: rawAbove, belowClans: rawBelow } = selectComparisonClans(
    window,
    currentIndex,
    3,
  );

  const ourClanSeriesRaw = await prisma.clanBattleSnapshot.findMany({
    where: { battleId, clanId: ourClanName },
    orderBy: { capturedAt: "asc" },
    take: 2000,
  });
  const ourSeries = buildCleanPointsSeries(
    ourClanSeriesRaw.map((s) => ({
      timestamp: s.capturedAt.getTime(),
      value: Number(s.battlePoints),
    })),
  );
  const rankSeries = buildRankSeries(
    ourClanSeriesRaw.map((s) => ({
      timestamp: s.capturedAt.getTime(),
      rank: s.rank,
    })),
  );

  const ourPoints = ourSeries.length ? ourSeries[ourSeries.length - 1].value : null;
  const ourPPH = calculatePph(ourSeries);

  const msRemaining =
    isLive && battle.endTime && battle.endTime.getTime() > now
      ? battle.endTime.getTime() - now
      : null;

  const ourClanRow = await prisma.clan.findUnique({ where: { id: ourClanName } });
  const kickCooldownEndsAt =
    ourClanRow?.lastKickTimestamp != null
      ? ourClanRow.lastKickTimestamp * 1000 + KICK_COOLDOWN_MS
      : null;

  const lastArchive = await prisma.battleArchive.findFirst({
    where: { battleId: { not: battleId } },
    orderBy: { finalizedAt: "desc" },
  });

  const aboveWithCompact = rawAbove.map((c, i) => ({
    clan: c.name,
    compact: rawAbove.length > 1 && i < rawAbove.length - 1,
  }));
  const belowWithCompact = rawBelow.map((c, i) => ({
    clan: c.name,
    compact: rawBelow.length > 1 && i > 0,
  }));
  const neighborNames = [
    ...aboveWithCompact.map((c) => c.clan),
    ...belowWithCompact.map((c) => c.clan),
  ];

  const [neighborClanRows, neighborSeriesRaw] = await Promise.all([
    neighborNames.length
      ? prisma.clan.findMany({ where: { id: { in: neighborNames } } })
      : Promise.resolve([]),
    neighborNames.length
      ? prisma.clanBattleSnapshot.findMany({
          where: { battleId, clanId: { in: neighborNames } },
          orderBy: { capturedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const iconByNeighbor = new Map(neighborClanRows.map((c) => [c.id, c.iconAssetId]));
  const seriesByNeighbor = new Map<string, Array<{ timestamp: number; value: number }>>();
  for (const s of neighborSeriesRaw) {
    const list = seriesByNeighbor.get(s.clanId) ?? [];
    list.push({ timestamp: s.capturedAt.getTime(), value: Number(s.battlePoints) });
    seriesByNeighbor.set(s.clanId, list);
  }

  function buildNeighbor(
    clanName: string,
    compact: boolean,
    side: "above" | "below",
  ) {
    const snap = snapshotAtLatest.find((s) => s.clanId === clanName);
    const series = buildCleanPointsSeries(seriesByNeighbor.get(clanName) ?? []);
    const points = snap ? Number(snap.battlePoints) : null;
    const pph = calculatePph(series);
    const delta5m = deltaAtWindow(series, FIVE_MIN_MS);
    const gap =
      ourPoints !== null && points !== null
        ? side === "above"
          ? Math.max(0, points - ourPoints + 1)
          : Math.max(0, ourPoints - points + 1)
        : null;
    const relativePPH =
      ourPPH !== null && pph !== null
        ? side === "above"
          ? ourPPH - pph
          : pph - ourPPH
        : null;

    return {
      name: clanName,
      rank: snap?.rank ?? null,
      points,
      pph,
      delta5m,
      pointsNeeded: gap,
      relativePPH,
      etaSeconds:
        gap !== null && relativePPH !== null && relativePPH > 0
          ? (gap / relativePPH) * 3600
          : null,
      iconUrl: ps99ImageUrl(iconByNeighbor.get(clanName) ?? null),
      // Poll only snapshots our clan members — neighbor active counts deferred.
      activeMembers: null,
      activeRosterSize: snap?.memberCount ?? null,
      compact,
    };
  }

  const aboveClans = aboveWithCompact.map(({ clan, compact }) =>
    buildNeighbor(clan, compact, "above"),
  );
  const belowClans = belowWithCompact.map(({ clan, compact }) =>
    buildNeighbor(clan, compact, "below"),
  );

  const gapToAbove = aboveClans.length
    ? (aboveClans[aboveClans.length - 1]?.pointsNeeded ?? null)
    : null;

  const playerSnaps: PlayerPointSnapshot[] = await prisma.playerPointSnapshot.findMany({
    where: {
      battleId,
      clanId: ourClanName,
      ...(isLive ? { capturedAt: { gte: new Date(now - 14 * HOUR_MS) } } : {}),
    },
    orderBy: { capturedAt: "asc" },
  });

  const snapsByUser = new Map<string, Array<{ timestamp: number; points: number }>>();
  for (const snap of playerSnaps) {
    const id = userIdToString(snap.robloxUserId);
    const list = snapsByUser.get(id) ?? [];
    list.push({ timestamp: snap.capturedAt.getTime(), points: Number(snap.battlePoints) });
    snapsByUser.set(id, list);
  }

  // Average placement from archived battles
  const archives = await prisma.battleArchive.findMany({
    orderBy: { finalizedAt: "desc" },
    take: 20,
  });
  const placementSums = new Map<string, { sum: number; count: number }>();
  for (const arch of archives) {
    const raw = arch.membersJson;
    const members = Array.isArray(raw) ? raw : [];
    const ranked = members
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const row = entry as Record<string, unknown>;
        return {
          robloxUserId: String(row.robloxUserId ?? ""),
          battlePoints: Number(row.battlePoints ?? 0),
        };
      })
      .filter((m): m is { robloxUserId: string; battlePoints: number } => !!m?.robloxUserId)
      .sort((a, b) => b.battlePoints - a.battlePoints);
    ranked.forEach((m, idx) => {
      const entry = placementSums.get(m.robloxUserId) ?? { sum: 0, count: 0 };
      entry.sum += idx + 1;
      entry.count += 1;
      placementSums.set(m.robloxUserId, entry);
    });
  }

  const memberships: Array<
    ClanMembership & { player: { displayName: string; avatarUrl: string | null } }
  > = await prisma.clanMembership.findMany({
    where: { clanId: ourClanName },
    include: { player: true },
  });

  const membersRaw = memberships.map((m) => {
    const id = userIdToString(m.robloxUserId);
    const series = snapsByUser.get(id) ?? [];
    const pointSeries = buildCleanPointsSeries(
      series.map((s) => ({ timestamp: s.timestamp, value: s.points })),
    );
    const history = pointSeries.map((s) => ({ timestamp: s.timestamp, points: s.value }));
    const battlePoints = pointSeries.length ? pointSeries[pointSeries.length - 1].value : 0;
    const placeStats = placementSums.get(id);
    return {
      robloxUserId: id,
      displayName: m.player.displayName,
      avatarUrl: m.player.avatarUrl,
      role:
        m.permissionLevel >= 255
          ? "Owner"
          : m.permissionLevel >= 90
            ? "Officer"
            : "Member",
      battlePoints,
      pph: calculatePph(pointSeries),
      delta5m: deltaAtWindow(pointSeries, FIVE_MIN_MS),
      delta30m: deltaAtWindow(pointSeries, 30 * FIVE_MIN_MS),
      delta60m: deltaAtWindow(pointSeries, HOUR_MS),
      delta12h: deltaAtWindow(pointSeries, 12 * HOUR_MS),
      delta24h: deltaAtWindow(pointSeries, 24 * HOUR_MS),
      inactiveMs: calculateInactiveMs(history),
      inactiveTotalMs: calculateTotalInactiveMs(history),
      streakPeakMs: calculatePeakStreakMs(history),
      avgPlacement: placeStats && placeStats.count > 0 ? placeStats.sum / placeStats.count : null,
      contributionPct: null as number | null,
      totalDonatedGems: null as number | null,
      rank: null as number | null,
      series: pointSeries.slice(-48),
    };
  });

  const totalPoints = membersRaw.reduce((sum, m) => sum + m.battlePoints, 0);
  const members = membersRaw
    .map((m) => ({
      ...m,
      contributionPct: totalPoints > 0 ? (m.battlePoints / totalPoints) * 100 : null,
    }))
    .sort((a, b) => b.battlePoints - a.battlePoints)
    .map((member, index) => ({ ...member, rank: index + 1 }));

  return {
    generatedAt: now,
    clanName: env.CLAN_NAME,
    battle: {
      id: battleId,
      title: battle.title,
      live: isLive,
      rank: ourSnapshot.rank,
      points: ourPoints,
      pph: ourPPH,
      delta5m: deltaAtWindow(ourSeries, FIVE_MIN_MS),
      msRemaining,
      endedAt: !isLive
        ? (battle.endTime?.getTime() ?? latestCapture?.getTime() ?? null)
        : null,
      memberCount: ourSnapshot.memberCount,
      contributorCount: ourSnapshot.contributorCount,
      kickCooldownEndsAt,
      gapToAbove,
      rankSeries,
      series: ourSeries.slice(-96),
      lastBattleRank: lastArchive?.ourRank ?? null,
      iconUrl: ps99ImageUrl(ourClanRow?.iconAssetId ?? null),
    },
    comparison: { aboveClans, belowClans },
    members,
  };
}
