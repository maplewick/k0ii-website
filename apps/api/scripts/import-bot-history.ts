/**
 * One-off: import bot JSON history into Prisma.
 *
 * Sources (repo root / DATA_DIR):
 *   - participation_store.json  → Battle + BattleArchive + Player
 *   - clan_history.json         → ClanBattleSnapshot + PlayerPointSnapshot (thinned)
 *   - live PS99 clan            → refresh contribs + ClanMembership
 *
 * Usage:
 *   bun --env-file=../../.env scripts/import-bot-history.ts
 *   bun --env-file=../../.env scripts/import-bot-history.ts --dry-run
 *   bun --env-file=../../.env scripts/import-bot-history.ts --skip-history
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Prisma } from "@prisma/client";

import { loadEnv } from "../src/env";
import { prisma } from "../src/lib/prisma";
import {
  fetchClan,
  fetchRobloxAvatarMap,
  fetchRobloxDisplayNames,
  type LegacyClan,
} from "../src/services/ps99-client";
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(apiRoot, "../../..");

const DRY = process.argv.includes("--dry-run");
const SKIP_HISTORY = process.argv.includes("--skip-history");
const HISTORY_THIN_MS = 30 * 60 * 1000;

type StoreBattle = {
  awardUserIds?: string[];
  place?: number | null;
  points?: number | null;
  medal?: string | null;
  startTime?: number | null;
  finishTime?: number | null;
  pointContribs?: Record<string, number>;
};

type ParticipationStore = {
  battles?: Record<string, StoreBattle>;
  legacyBattles?: Record<string, StoreBattle>;
  memberJoinTimes?: Record<string, number>;
  diamondContribs?: Record<string, number>;
};

type HistorySnap = {
  timestamp: number;
  battleID?: string;
  battlePoints?: number;
  memberCount?: number;
  contributorCount?: number;
  points?: Record<string, number>;
  ranking?: { rank?: number };
  roster?: Array<{
    roblox_id?: string | number;
    roblox_username?: string;
    displayName?: string;
    permissionLevel?: number;
  }>;
};

function resolveDataPath(name: string): string | null {
  const candidates = [
    process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH, name)
      : null,
    resolve(repoRoot, name),
    resolve(apiRoot, "../../../", name),
    resolve(".", name),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function unixToDate(sec: number | null | undefined): Date | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  // participation store uses unix seconds
  return new Date(sec * 1000);
}

function msToDate(ms: number | null | undefined): Date | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms);
}

function pickBetter(a: StoreBattle | undefined, b: StoreBattle | undefined): StoreBattle {
  const left = a ?? {};
  const right = b ?? {};
  const leftN = Object.keys(left.pointContribs ?? {}).length;
  const rightN = Object.keys(right.pointContribs ?? {}).length;
  const base = rightN > leftN ? { ...left, ...right } : { ...right, ...left };
  return {
    ...base,
    pointContribs: {
      ...(left.pointContribs ?? {}),
      ...(right.pointContribs ?? {}),
    },
    place: base.place ?? left.place ?? right.place ?? null,
    points: base.points ?? left.points ?? right.points ?? null,
    medal: base.medal ?? left.medal ?? right.medal ?? null,
    startTime: base.startTime ?? left.startTime ?? right.startTime ?? null,
    finishTime: base.finishTime ?? left.finishTime ?? right.finishTime ?? null,
  };
}

function mergeStores(store: ParticipationStore): Record<string, StoreBattle> {
  const out: Record<string, StoreBattle> = {};
  for (const [id, row] of Object.entries(store.battles ?? {})) {
    out[id] = { ...row };
  }
  for (const [id, row] of Object.entries(store.legacyBattles ?? {})) {
    out[id] = pickBetter(out[id], row);
  }
  return out;
}

function applyLiveClanBattles(
  merged: Record<string, StoreBattle>,
  clan: LegacyClan | null,
): void {
  if (!clan?.Battles) return;
  for (const [key, entry] of Object.entries(clan.Battles)) {
    const battleId = String(entry.BattleID ?? key).trim();
    if (!battleId) continue;
    const contribs: Record<string, number> = {};
    for (const row of entry.PointContributions ?? []) {
      const id = String(row.UserID ?? "").trim();
      if (!id) continue;
      contribs[id] = Number(row.Points) || 0;
    }
    const existing = merged[battleId] ?? {};
    const existingN = Object.keys(existing.pointContribs ?? {}).length;
    const liveN = Object.keys(contribs).length;
    merged[battleId] = {
      ...existing,
      place: entry.Place ?? existing.place ?? null,
      points: entry.Points ?? existing.points ?? null,
      pointContribs:
        liveN >= existingN
          ? { ...(existing.pointContribs ?? {}), ...contribs }
          : { ...contribs, ...(existing.pointContribs ?? {}) },
    };
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchNamesAndAvatars(userIds: string[]): Promise<{
  names: Record<string, string>;
  avatars: Record<string, string>;
}> {
  const names: Record<string, string> = {};
  const avatars: Record<string, string> = {};
  for (const group of chunk(userIds, 100)) {
    const [n, a] = await Promise.all([
      fetchRobloxDisplayNames(group),
      fetchRobloxAvatarMap(group),
    ]);
    Object.assign(names, n);
    Object.assign(avatars, a);
    await Bun.sleep(120);
  }
  return { names, avatars };
}

function buildMembersJson(
  contribs: Record<string, number>,
  names: Record<string, string>,
  avatars: Record<string, string>,
): Array<{
  robloxUserId: string;
  displayName: string;
  avatarUrl: string | null;
  battlePoints: number;
  contributionPct: number | null;
}> {
  const total = Object.values(contribs).reduce((a, b) => a + (Number(b) || 0), 0);
  return Object.entries(contribs)
    .map(([id, pts]) => {
      const battlePoints = Number(pts) || 0;
      const pct = total > 0 ? (battlePoints / total) * 100 : null;
      return {
        robloxUserId: id,
        displayName: names[id] ?? `User ${id}`,
        avatarUrl: avatars[id] ?? null,
        battlePoints,
        contributionPct: pct,
      };
    })
    .filter((m) => m.battlePoints > 0)
    .sort((a, b) => b.battlePoints - a.battlePoints);
}

function thinSnaps(snaps: HistorySnap[]): HistorySnap[] {
  if (snaps.length === 0) return [];
  const out: HistorySnap[] = [];
  let lastKept = -Infinity;
  for (let i = 0; i < snaps.length; i++) {
    const s = snaps[i]!;
    if (i === snaps.length - 1 || s.timestamp - lastKept >= HISTORY_THIN_MS) {
      out.push(s);
      lastKept = s.timestamp;
    }
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const clanId = env.CLAN_NAME;

  const storePath = resolveDataPath("participation_store.json");
  if (!storePath) {
    console.error("participation_store.json not found (repo root or DATA_DIR)");
    process.exit(1);
  }
  const historyPath = resolveDataPath("clan_history.json");

  console.log(`[import] clan=${clanId} dry=${DRY}`);
  console.log(`[import] store=${storePath}`);
  if (historyPath) console.log(`[import] history=${historyPath}`);
  else console.log("[import] clan_history.json missing — skipping series");

  const store = readJson<ParticipationStore>(storePath);
  const merged = mergeStores(store);

  console.log("[import] fetching live PS99 clan for fresh contribs/roster…");
  const liveClan = await fetchClan(clanId);
  applyLiveClanBattles(merged, liveClan);

  const battleIds = Object.keys(merged).sort();
  console.log(`[import] battles to upsert: ${battleIds.length}`);

  const allUserIds = new Set<string>();
  for (const row of Object.values(merged)) {
    for (const id of Object.keys(row.pointContribs ?? {})) allUserIds.add(id);
    for (const id of row.awardUserIds ?? []) {
      if (id) allUserIds.add(String(id));
    }
  }
  for (const id of Object.keys(store.memberJoinTimes ?? {})) allUserIds.add(id);
  for (const m of liveClan?.Members ?? []) {
    const id = String(m.UserID ?? "").trim();
    if (id) allUserIds.add(id);
  }

  const userIdList = [...allUserIds].filter((id) => /^\d+$/.test(id));
  console.log(`[import] resolving ${userIdList.length} Roblox profiles…`);
  const { names, avatars } = DRY
    ? { names: {} as Record<string, string>, avatars: {} as Record<string, string> }
    : await fetchNamesAndAvatars(userIdList);

  if (DRY) {
    let withMembers = 0;
    for (const id of battleIds) {
      const n = Object.keys(merged[id]?.pointContribs ?? {}).length;
      if (n > 0) withMembers += 1;
      console.log(`  ${id} place=${merged[id]?.place ?? "-"} pts=${merged[id]?.points ?? "-"} members=${n}`);
    }
    console.log(`[import] dry-run done. archivesWithMembers=${withMembers}/${battleIds.length}`);
    return;
  }

  await prisma.clan.upsert({
    where: { id: clanId },
    create: {
      id: clanId,
      isPrimary: true,
      memberCapacity: liveClan?.MemberCapacity ?? null,
      countryCode: liveClan?.CountryCode ?? null,
      lastKickTimestamp: liveClan?.LastKickTimestamp ?? null,
    },
    update: {
      isPrimary: true,
      memberCapacity: liveClan?.MemberCapacity ?? null,
      countryCode: liveClan?.CountryCode ?? null,
      lastKickTimestamp: liveClan?.LastKickTimestamp ?? null,
    },
  });

  // Players
  let playerUpserts = 0;
  for (const group of chunk(userIdList, 50)) {
    await prisma.$transaction(
      group.map((id) =>
        prisma.player.upsert({
          where: { robloxUserId: BigInt(id) },
          create: {
            robloxUserId: BigInt(id),
            displayName: names[id] ?? `User ${id}`,
            avatarUrl: avatars[id] ?? null,
          },
          update: {
            displayName: names[id] ?? undefined,
            avatarUrl: avatars[id] ?? undefined,
          },
        }),
      ),
    );
    playerUpserts += group.length;
  }
  console.log(`[import] players upserted≈${playerUpserts}`);

  // Memberships from live clan + join times
  const membershipRows = new Map<
    string,
    { permissionLevel: number; joinedAt: Date | null }
  >();
  for (const m of liveClan?.Members ?? []) {
    const id = String(m.UserID ?? "").trim();
    if (!/^\d+$/.test(id)) continue;
    const joinSec = store.memberJoinTimes?.[id] ?? m.JoinTime ?? null;
    membershipRows.set(id, {
      permissionLevel: Number(m.PermissionLevel) || 0,
      joinedAt: unixToDate(joinSec),
    });
  }
  for (const [id, joinSec] of Object.entries(store.memberJoinTimes ?? {})) {
    if (!/^\d+$/.test(id)) continue;
    if (membershipRows.has(id)) continue;
    membershipRows.set(id, {
      permissionLevel: 0,
      joinedAt: unixToDate(joinSec),
    });
  }

  let membershipUpserts = 0;
  for (const group of chunk([...membershipRows.entries()], 40)) {
    await prisma.$transaction(
      group.map(([id, meta]) =>
        prisma.clanMembership.upsert({
          where: {
            clanId_robloxUserId: {
              clanId,
              robloxUserId: BigInt(id),
            },
          },
          create: {
            clanId,
            robloxUserId: BigInt(id),
            permissionLevel: meta.permissionLevel,
            joinedAt: meta.joinedAt,
          },
          update: {
            permissionLevel: meta.permissionLevel,
            joinedAt: meta.joinedAt ?? undefined,
          },
        }),
      ),
    );
    membershipUpserts += group.length;
  }
  console.log(`[import] memberships upserted≈${membershipUpserts}`);

  // Battles + archives
  let archivesCreated = 0;
  let archivesSkipped = 0;
  let battlesUpserted = 0;

  const nowMs = Date.now();
  for (const battleId of battleIds) {
    const row = merged[battleId]!;
    const startTime = unixToDate(row.startTime);
    const endTime = unixToDate(row.finishTime);
    const finished =
      endTime != null && endTime.getTime() <= nowMs
        ? true
        : endTime == null && startTime != null && startTime.getTime() < nowMs - 7 * 24 * 3600 * 1000;
    const state = finished ? "past" : endTime && endTime.getTime() > nowMs ? "live" : "past";

    await prisma.battle.upsert({
      where: { id: battleId },
      create: {
        id: battleId,
        title: battleId,
        startTime,
        endTime,
        state,
      },
      update: {
        title: battleId,
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
        ...(finished ? { state: "past" } : {}),
      },
    });
    battlesUpserted += 1;

    const existing = await prisma.battleArchive.findUnique({
      where: { battleId },
    });
    if (existing) {
      // Refresh membersJson if we now have richer contribs
      const members = buildMembersJson(row.pointContribs ?? {}, names, avatars);
      if (
        members.length > 0 &&
        (!Array.isArray(existing.membersJson) ||
          (existing.membersJson as unknown[]).length < members.length)
      ) {
        await prisma.battleArchive.update({
          where: { battleId },
          data: {
            ourRank: row.place ?? existing.ourRank,
            ourPoints:
              row.points != null ? BigInt(Math.round(row.points)) : existing.ourPoints,
            medal: row.medal ?? existing.medal,
            participantCount: members.length,
            membersJson: members as unknown as Prisma.InputJsonValue,
            startedAt: startTime ?? existing.startedAt,
            endedAt: endTime ?? existing.endedAt,
          },
        });
        archivesCreated += 1;
      } else {
        archivesSkipped += 1;
      }
      continue;
    }

    const members = buildMembersJson(row.pointContribs ?? {}, names, avatars);
    await prisma.battleArchive.create({
      data: {
        battleId,
        finalizedAt: endTime ?? startTime ?? new Date(),
        startedAt: startTime,
        endedAt: endTime,
        ourRank: row.place ?? null,
        ourPoints: row.points != null ? BigInt(Math.round(row.points)) : null,
        medal: row.medal ?? null,
        participantCount: members.length || null,
        membersJson: members as unknown as Prisma.InputJsonValue,
      },
    });
    archivesCreated += 1;
  }
  console.log(
    `[import] battles=${battlesUpserted} archivesCreated/updated=${archivesCreated} archivesSkipped=${archivesSkipped}`,
  );

  // clan_history → thinned snapshots
  if (!SKIP_HISTORY && historyPath) {
    const history = readJson<HistorySnap[]>(historyPath);
    const byBattle = new Map<string, HistorySnap[]>();
    for (const snap of history) {
      const bid = String(snap.battleID ?? "").trim();
      if (!bid) continue;
      const list = byBattle.get(bid) ?? [];
      list.push(snap);
      byBattle.set(bid, list);
    }

    for (const [battleId, snaps] of byBattle) {
      const existingSnaps = await prisma.clanBattleSnapshot.count({
        where: { battleId, clanId },
      });
      if (existingSnaps > 0) {
        console.log(
          `[import] history ${battleId}: skip (${existingSnaps} clan snaps already in DB)`,
        );
        continue;
      }

      await prisma.battle.upsert({
        where: { id: battleId },
        create: {
          id: battleId,
          title: battleId,
          state: "past",
        },
        update: {},
      });

      const thinned = thinSnaps(snaps.sort((a, b) => a.timestamp - b.timestamp));
      console.log(
        `[import] history ${battleId}: ${snaps.length} snaps → ${thinned.length} thinned`,
      );

      // Ensure players from history points exist
      const histIds = new Set<string>();
      for (const s of thinned) {
        for (const id of Object.keys(s.points ?? {})) {
          if (/^\d+$/.test(id)) histIds.add(id);
        }
        for (const r of s.roster ?? []) {
          const id = String(r.roblox_id ?? "").trim();
          if (/^\d+$/.test(id)) histIds.add(id);
        }
      }
      const missing = [...histIds].filter((id) => !names[id]);
      if (missing.length) {
        const extra = await fetchNamesAndAvatars(missing);
        Object.assign(names, extra.names);
        Object.assign(avatars, extra.avatars);
        for (const group of chunk(missing, 50)) {
          await prisma.$transaction(
            group.map((id) =>
              prisma.player.upsert({
                where: { robloxUserId: BigInt(id) },
                create: {
                  robloxUserId: BigInt(id),
                  displayName: names[id] ?? `User ${id}`,
                  avatarUrl: avatars[id] ?? null,
                },
                update: {
                  displayName: names[id] ?? undefined,
                  avatarUrl: avatars[id] ?? undefined,
                },
              }),
            ),
          );
        }
      }

      let clanSnapCount = 0;
      let playerSnapCount = 0;

      for (const s of thinned) {
        const capturedAt = msToDate(s.timestamp);
        if (!capturedAt) continue;

        await prisma.clanBattleSnapshot.create({
          data: {
            battleId,
            clanId,
            capturedAt,
            battlePoints: BigInt(Math.round(Number(s.battlePoints) || 0)),
            rank: s.ranking?.rank ?? null,
            memberCount: s.memberCount ?? null,
            contributorCount: s.contributorCount ?? null,
          },
        });
        clanSnapCount += 1;

        const points = s.points ?? {};
        const rows = Object.entries(points)
          .filter(([id, pts]) => /^\d+$/.test(id) && Number(pts) > 0)
          .map(([id, pts]) => ({
            battleId,
            clanId,
            robloxUserId: BigInt(id),
            capturedAt,
            battlePoints: BigInt(Math.round(Number(pts) || 0)),
          }));

        for (const group of chunk(rows, 80)) {
          await prisma.playerPointSnapshot.createMany({ data: group });
          playerSnapCount += group.length;
        }
      }

      console.log(
        `[import] history ${battleId}: clanSnaps=${clanSnapCount} playerSnaps≈${playerSnapCount}`,
      );
    }
  }

  console.log("[import] done");
}

main()
  .catch((err) => {
    console.error("[import] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
