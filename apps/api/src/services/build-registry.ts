import type { RegistryBattleEntry, RegistryResponse } from "@k0ii/schemas";
import type { Env } from "../env";
import { prisma, userIdToString } from "../lib/prisma";

/** Staff Roblox IDs kept in sync with web `lib/registry-data.ts`. */
const STAFF_IDS = [
  "20730159",
  "279010107",
  "1522057458",
  "111289122",
  "1207553509",
  "49526463",
  "619312547",
  "484051839",
  "1324701528",
  "517312871",
  "1260752023",
] as const;

function httpsAvatar(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (!url.startsWith("https://") || url.length > 2048) return null;
  return url;
}

type ArchiveMember = {
  robloxUserId: string;
  battlePoints: number;
};

function parseArchiveMembers(raw: unknown): ArchiveMember[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const robloxUserId = String(r.robloxUserId ?? "").trim();
      if (!robloxUserId) return null;
      return {
        robloxUserId,
        battlePoints: Number(r.battlePoints ?? 0) || 0,
      };
    })
    .filter((m): m is ArchiveMember => m != null && m.battlePoints > 0);
}

/**
 * Avatars + per-player battle history for the community registry.
 * Mirrors legacy bot `/api/registry` using Prisma archives + live snapshots.
 */
export async function buildRegistryResponse(env: Env): Promise<RegistryResponse> {
  const clanId = env.CLAN_NAME;
  const now = Date.now();

  const memberships = await prisma.clanMembership.findMany({
    where: { clanId },
    include: { player: true },
  });

  const rosterIds = memberships.map((m) => userIdToString(m.robloxUserId));
  const allIds = [...new Set([...STAFF_IDS, ...rosterIds])];

  const players = await prisma.player.findMany({
    where: { robloxUserId: { in: allIds.map((id) => BigInt(id)) } },
  });
  const avatarById = new Map(
    players.map((p) => [userIdToString(p.robloxUserId), httpsAvatar(p.avatarUrl)]),
  );

  const avatars: Record<string, string | null> = {};
  for (const id of allIds) {
    avatars[id] = avatarById.get(id) ?? null;
  }

  const battleHistory: Record<string, RegistryBattleEntry[]> = {};
  for (const id of allIds) {
    battleHistory[id] = [];
  }

  const archives = await prisma.battleArchive.findMany({
    orderBy: { finalizedAt: "desc" },
    take: 80,
  });

  for (const arch of archives) {
    const members = parseArchiveMembers(arch.membersJson)
      .slice()
      .sort((a, b) => b.battlePoints - a.battlePoints);
    if (!members.length) continue;
    members.forEach((m, idx) => {
      const list = battleHistory[m.robloxUserId];
      if (!list) return;
      if (list.some((b) => b.battleId === arch.battleId)) return;
      list.push({
        battleId: arch.battleId,
        points: m.battlePoints,
        rank: idx + 1,
        total: members.length,
        clanPlace: arch.ourRank ?? null,
        active: false,
      });
    });
  }

  const live = await prisma.battle.findFirst({
    where: { state: "live" },
    orderBy: { updatedAt: "desc" },
  });

  if (live) {
    const snaps = await prisma.playerPointSnapshot.findMany({
      where: { battleId: live.id, clanId },
      orderBy: { capturedAt: "desc" },
    });
    const latest = new Map<string, number>();
    for (const snap of snaps) {
      const id = userIdToString(snap.robloxUserId);
      if (latest.has(id)) continue;
      latest.set(id, Number(snap.battlePoints));
    }
    const ranked = [...latest.entries()]
      .filter(([, pts]) => pts > 0)
      .sort((a, b) => b[1] - a[1]);
    const clanSnap = await prisma.clanBattleSnapshot.findFirst({
      where: { battleId: live.id, clanId },
      orderBy: { capturedAt: "desc" },
    });
    ranked.forEach(([id, points], idx) => {
      const list = battleHistory[id];
      if (!list) return;
      if (list.some((b) => b.battleId === live.id)) return;
      list.push({
        battleId: live.id,
        points,
        rank: idx + 1,
        total: ranked.length,
        clanPlace: clanSnap?.rank ?? null,
        active: true,
      });
    });
  }

  for (const id of allIds) {
    battleHistory[id].sort((a, b) => b.points - a.points);
  }

  return { generatedAt: now, avatars, battleHistory };
}
