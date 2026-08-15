import type { BattleArchiveResponse, BattleDetail } from "@k0ii/schemas";
import type { Prisma } from "@prisma/client";
import type { Env } from "../env";
import { prisma, userIdToString } from "../lib/prisma";
import { fetchRobloxDisplayNames } from "./ps99-client";
import { buildCleanPointsSeries } from "./stats";

function isPlaceholderName(name: string, userId: string): boolean {
  const n = name.trim();
  if (!n || n === "Unknown") return true;
  if (n === `User ${userId}`) return true;
  if (/^User \d+$/i.test(n)) return true;
  return false;
}

function readArchiveMember(row: Record<string, unknown>) {
  const robloxUserId = String(
    row.robloxUserId ?? row.userId ?? row.UserID ?? "",
  ).trim();
  const rawName = String(
    row.displayName ??
      row.roblox_username ??
      row.username ??
      row.name ??
      "",
  ).trim();
  return {
    robloxUserId,
    displayName: rawName || (robloxUserId ? `User ${robloxUserId}` : "Unknown"),
    avatarUrl: (row.avatarUrl as string | null) ?? null,
    battlePoints: Number(row.battlePoints ?? row.points ?? 0) || 0,
    contributionPct:
      typeof row.contributionPct === "number" ? row.contributionPct : null,
  };
}

/**
 * Per-member point series for a battle, keyed by Roblox id. Shared by the
 * archived and live paths so a battle charts the same way either side of being
 * archived.
 */
async function loadPlayerSeries(
  env: Env,
  battleId: string,
): Promise<Map<string, Array<{ timestamp: number; value: number }>>> {
  const snaps = await prisma.playerPointSnapshot.findMany({
    where: { battleId, clanId: env.CLAN_NAME },
    orderBy: { capturedAt: "asc" },
  });

  const byUser = new Map<string, Array<{ timestamp: number; value: number }>>();
  for (const snap of snaps) {
    const id = userIdToString(snap.robloxUserId);
    const list = byUser.get(id) ?? [];
    list.push({
      timestamp: snap.capturedAt.getTime(),
      value: Number(snap.battlePoints),
    });
    byUser.set(id, list);
  }

  const cleaned = new Map<string, Array<{ timestamp: number; value: number }>>();
  for (const [id, series] of byUser) cleaned.set(id, buildCleanPointsSeries(series));
  return cleaned;
}

async function resolveMemberNames(
  members: Array<{ robloxUserId: string; displayName: string }>,
): Promise<Record<string, string>> {
  const needFetch = members
    .filter((m) => m.robloxUserId && isPlaceholderName(m.displayName, m.robloxUserId))
    .map((m) => m.robloxUserId);
  if (!needFetch.length) return {};

  const fromDb = await prisma.player.findMany({
    where: { robloxUserId: { in: needFetch.map((id) => BigInt(id)) } },
  });
  const resolved: Record<string, string> = {};
  const stillNeed: string[] = [];

  for (const id of needFetch) {
    const player = fromDb.find((p) => userIdToString(p.robloxUserId) === id);
    if (player && !isPlaceholderName(player.displayName, id)) {
      resolved[id] = player.displayName;
    } else {
      stillNeed.push(id);
    }
  }

  if (stillNeed.length) {
    const fromRoblox = await fetchRobloxDisplayNames(stillNeed);
    Object.assign(resolved, fromRoblox);

    const updates = Object.entries(fromRoblox).filter(
      ([id, name]) => name && !isPlaceholderName(name, id),
    );
    if (updates.length) {
      await Promise.all(
        updates.map(([id, displayName]) =>
          prisma.player.updateMany({
            where: { robloxUserId: BigInt(id) },
            data: { displayName },
          }),
        ),
      );
    }
  }

  return resolved;
}

export async function buildBattleArchiveResponse(
  env: Env,
): Promise<BattleArchiveResponse> {
  const now = Date.now();
  const live = await prisma.battle.findFirst({
    where: { state: "live" },
    orderBy: { updatedAt: "desc" },
  });

  const archives = await prisma.battleArchive.findMany({
    orderBy: { finalizedAt: "desc" },
    take: 50,
    include: { battle: true },
  });

  return {
    generatedAt: now,
    currentBattleId: live?.id ?? null,
    battles: archives.map((a) => ({
      battleId: a.battleId,
      title: a.battle.title,
      finalizedAt: a.finalizedAt.getTime(),
      startedAt: a.startedAt?.getTime() ?? null,
      endedAt: a.endedAt?.getTime() ?? null,
      ourRank: a.ourRank,
      ourPoints: a.ourPoints != null ? Number(a.ourPoints) : null,
      medal: a.medal,
      participantCount: a.participantCount,
    })),
  };
}

export async function buildBattleDetail(
  env: Env,
  battleId: string,
): Promise<BattleDetail | null> {
  const battle = await prisma.battle.findUnique({ where: { id: battleId } });
  if (!battle) return null;

  const archive = await prisma.battleArchive.findUnique({ where: { battleId } });
  const isLive = battle.state === "live";

  if (archive && Array.isArray(archive.membersJson)) {
    const parsed = (archive.membersJson as Array<Record<string, unknown>>)
      .map(readArchiveMember)
      .filter((m) => m.robloxUserId);

    const nameFixes = await resolveMemberNames(parsed);
    let dirty = false;
    const members = parsed.map((m) => {
      const fixed = nameFixes[m.robloxUserId];
      if (fixed && fixed !== m.displayName) {
        dirty = true;
        return { ...m, displayName: fixed };
      }
      return m;
    });

    // Persist resolved usernames + drop legacy grade field from stored JSON.
    if (dirty || parsed.some((_, i) => {
      const raw = (archive.membersJson as Array<Record<string, unknown>>)[i];
      return raw != null && "grade" in raw;
    })) {
      await prisma.battleArchive.update({
        where: { battleId },
        data: {
          membersJson: members as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // The archive JSON stores final standings only — no per-member series — so
    // on its own this path renders a member dialog with an empty chart. Where we
    // still hold snapshots for the battle, fold them back in; archived battles
    // that predate snapshot collection simply keep an empty series.
    const archivedSeries = await loadPlayerSeries(env, battleId);
    const membersWithSeries = members.map((m) => ({
      ...m,
      series: archivedSeries.get(m.robloxUserId) ?? [],
    }));

    return {
      battleId,
      title: battle.title,
      live: false,
      startedAt: archive.startedAt?.getTime() ?? battle.startTime?.getTime() ?? null,
      endedAt: archive.endedAt?.getTime() ?? battle.endTime?.getTime() ?? null,
      ourRank: archive.ourRank,
      ourPoints: archive.ourPoints != null ? Number(archive.ourPoints) : null,
      medal: archive.medal,
      members: membersWithSeries,
    };
  }

  // Live / unarchived: build from player snapshots
  const snaps = await prisma.playerPointSnapshot.findMany({
    where: { battleId, clanId: env.CLAN_NAME },
    orderBy: { capturedAt: "asc" },
  });
  const byUser = new Map<string, Array<{ timestamp: number; value: number }>>();
  for (const snap of snaps) {
    const id = userIdToString(snap.robloxUserId);
    const list = byUser.get(id) ?? [];
    list.push({ timestamp: snap.capturedAt.getTime(), value: Number(snap.battlePoints) });
    byUser.set(id, list);
  }

  const players = await prisma.player.findMany({
    where: { robloxUserId: { in: [...byUser.keys()].map((id) => BigInt(id)) } },
  });
  const playerMap = new Map(players.map((p) => [userIdToString(p.robloxUserId), p]));

  const membersRaw = [...byUser.entries()].map(([id, series]) => {
    const cleaned = buildCleanPointsSeries(series);
    const points = cleaned.length ? cleaned[cleaned.length - 1]!.value : 0;
    const player = playerMap.get(id);
    return {
      robloxUserId: id,
      displayName: player?.displayName ?? `User ${id}`,
      avatarUrl: player?.avatarUrl ?? null,
      battlePoints: points,
      series: cleaned,
    };
  });

  const nameFixes = await resolveMemberNames(membersRaw);
  for (const m of membersRaw) {
    const fixed = nameFixes[m.robloxUserId];
    if (fixed) m.displayName = fixed;
  }

  const total = membersRaw.reduce((s, m) => s + m.battlePoints, 0);
  const ourSnap = await prisma.clanBattleSnapshot.findFirst({
    where: { battleId, clanId: env.CLAN_NAME },
    orderBy: { capturedAt: "desc" },
  });

  return {
    battleId,
    title: battle.title,
    live: isLive,
    startedAt: battle.startTime?.getTime() ?? null,
    endedAt: battle.endTime?.getTime() ?? null,
    ourRank: ourSnap?.rank ?? null,
    ourPoints: ourSnap ? Number(ourSnap.battlePoints) : total,
    medal: null,
    members: membersRaw
      .map((m) => {
        const pct = total > 0 ? (m.battlePoints / total) * 100 : null;
        return {
          robloxUserId: m.robloxUserId,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          battlePoints: m.battlePoints,
          contributionPct: pct,
          series: m.series.slice(-96),
        };
      })
      .sort((a, b) => b.battlePoints - a.battlePoints),
  };
}
