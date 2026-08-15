import type { Env } from "../env";
import { invalidateResponseCache } from "../lib/response-cache";
import { writePollStamp } from "../lib/poll-stamp";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import {
  extractAssetId,
  fetchActiveClanBattle,
  fetchBattleDetail,
  fetchClan,
  fetchRobloxAvatarMap,
  fetchRobloxDisplayNames,
  type LegacyClan,
  type V1BattleClan,
} from "./ps99-client";
import { pruneSnapshots } from "./prune-snapshots";
export type PollResult = {
  live: boolean;
  ops: number;
};

type PlayerCache = { displayName: string; avatarUrl: string | null };
type MembershipCache = { permissionLevel: number };
type ClanMetaCache = {
  iconAssetId: string | null;
  countryCode: string | null;
  memberCapacity: number | null;
  lastKickTimestamp: number | null;
};
type PlayerSnapCache = { points: bigint; at: number };

const playerCache = new Map<string, PlayerCache>();
const membershipCache = new Map<string, MembershipCache>();
const clanMetaCache = new Map<string, ClanMetaCache>();
const playerSnapCache = new Map<string, PlayerSnapCache>();
/** Player rows confirmed in DB (hydrate + successful creates). */
const persistedPlayerIds = new Set<string>();
/** Battle ids that already have rewardsJson persisted (skip repeat writes). */
const rewardsPersisted = new Set<string>();

let liveTickCount = 0;
let rollingOpsSamples: number[] = [];
let memoryHydrated = false;

function memberPointsMap(clan: LegacyClan, battleId: string): Map<string, number> {
  const map = new Map<string, number>();
  const battle = clan.Battles?.[battleId];
  for (const entry of battle?.PointContributions ?? []) {
    map.set(String(entry.UserID), Number(entry.Points) || 0);
  }
  return map;
}

function rosterUserIds(clan: LegacyClan): string[] {
  const ownerId = clan.Owner ? String(clan.Owner) : null;
  const members = clan.Members ?? [];
  const ids = members.map((m) => String(m.UserID)).filter(Boolean);
  if (ownerId && !ids.includes(ownerId)) ids.unshift(ownerId);
  return ids;
}

/** Drop ClanMembership rows for people no longer on the live PS99 roster. */
async function pruneStaleMemberships(
  clanId: string,
  activeUserIds: string[],
): Promise<number> {
  if (activeUserIds.length === 0) {
    console.warn("[poll] skip membership prune — empty roster from PS99");
    return 0;
  }
  const active = new Set(activeUserIds);
  const result = await prisma.clanMembership.deleteMany({
    where: {
      clanId,
      robloxUserId: { notIn: activeUserIds.map((id) => BigInt(id)) },
    },
  });
  if (result.count > 0) {
    for (const id of [...membershipCache.keys()]) {
      if (!active.has(id)) membershipCache.delete(id);
    }
    console.log(`[poll] pruned ${result.count} stale membership(s) for ${clanId}`);
  }
  return result.count > 0 ? 1 : 0;
}

function estimateMonthlyOps(opsThisTick: number, live: boolean, env: Env): number {
  rollingOpsSamples.push(opsThisTick);
  if (rollingOpsSamples.length > 48) rollingOpsSamples.shift();
  const avg =
    rollingOpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, rollingOpsSamples.length);
  const ticksPerDay = live
    ? (24 * 60 * 60 * 1000) / env.POLL_INTERVAL_MS
    : (24 * 60 * 60 * 1000) / env.POLL_INTERVAL_IDLE_MS;
  // Rough blend: ~14 live days + ~16 idle days / month
  const liveDays = 14;
  const idleDays = 16;
  const liveTicksPerDay = (24 * 60 * 60 * 1000) / env.POLL_INTERVAL_MS;
  const idleTicksPerDay = (24 * 60 * 60 * 1000) / env.POLL_INTERVAL_IDLE_MS;
  if (live) {
    return Math.round(avg * liveTicksPerDay * liveDays + 3 * idleTicksPerDay * idleDays);
  }
  return Math.round(avg * ticksPerDay * 30);
}

async function hydrateMemory(clanId: string, userIds: string[]): Promise<number> {
  if (memoryHydrated) return 0;
  let ops = 0;
  const bigIds = userIds.map((id) => BigInt(id));

  if (bigIds.length) {
    const players = await prisma.player.findMany({
      where: { robloxUserId: { in: bigIds } },
    });
    ops += 1;
    for (const p of players) {
      const id = String(p.robloxUserId);
      persistedPlayerIds.add(id);
      playerCache.set(id, {
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      });
    }

    const memberships = await prisma.clanMembership.findMany({
      where: { clanId, robloxUserId: { in: bigIds } },
    });
    ops += 1;
    for (const m of memberships) {
      membershipCache.set(String(m.robloxUserId), {
        permissionLevel: m.permissionLevel,
      });
    }
  }

  const clans = await prisma.clan.findMany({ take: 200 });
  ops += 1;
  for (const c of clans) {
    clanMetaCache.set(c.id, {
      iconAssetId: c.iconAssetId,
      countryCode: c.countryCode,
      memberCapacity: c.memberCapacity,
      lastKickTimestamp: c.lastKickTimestamp,
    });
  }

  memoryHydrated = true;
  return ops;
}

async function archiveBattleIfNeeded(
  env: Env,
  battleId: string,
  ourClan: LegacyClan,
  topClans: V1BattleClan[],
  meta: { title: string; startTime: number | null; finishTime: number | null; state: string },
): Promise<{ archived: boolean; ops: number }> {
  if (meta.state !== "past") return { archived: false, ops: 0 };

  const existing = await prisma.battleArchive.findUnique({ where: { battleId } });
  if (existing) return { archived: false, ops: 1 };

  const ourRow = topClans.find((c) => c.name === env.CLAN_NAME);
  const pointsByUser = memberPointsMap(ourClan, battleId);
  const totalPoints = [...pointsByUser.values()].reduce((a, b) => a + b, 0);
  const userIds = rosterUserIds(ourClan);
  const displayNames = await fetchRobloxDisplayNames(userIds);
  const avatars = await fetchRobloxAvatarMap(userIds);

  const members = userIds
    .map((id) => {
      const points = pointsByUser.get(id) ?? 0;
      const pct = totalPoints > 0 ? (points / totalPoints) * 100 : null;
      return {
        robloxUserId: id,
        displayName: displayNames[id] ?? `User ${id}`,
        avatarUrl: avatars[id] ?? null,
        battlePoints: points,
        contributionPct: pct,
      };
    })
    .sort((a, b) => b.battlePoints - a.battlePoints);

  await prisma.battleArchive.create({
    data: {
      battleId,
      finalizedAt: new Date(),
      startedAt: meta.startTime ? new Date(meta.startTime * 1000) : null,
      endedAt: meta.finishTime ? new Date(meta.finishTime * 1000) : null,
      ourRank: ourRow?.rank ?? ourClan.Battles?.[battleId]?.Place ?? null,
      ourPoints: BigInt(ourRow?.points ?? totalPoints),
      medal: ourRow?.medal ?? null,
      participantCount: members.filter((m) => m.battlePoints > 0).length,
      membersJson: members,
    },
  });

  console.log(`[poll] archived battle ${battleId} rank=${ourRow?.rank ?? "?"}`);
  return { archived: true, ops: 2 };
}

function selectLadderClans(
  topClans: V1BattleClan[],
  ourName: string,
  window: number,
  fullLadder: boolean,
): V1BattleClan[] {
  if (fullLadder) return topClans.slice(0, 50);
  const ourIndex = topClans.findIndex((c) => c.name === ourName);
  if (ourIndex < 0) {
    const ours = topClans.find((c) => c.name === ourName);
    return ours ? [ours, ...topClans.slice(0, Math.min(20, topClans.length))] : topClans.slice(0, 21);
  }
  const start = Math.max(0, ourIndex - window);
  const end = Math.min(topClans.length, ourIndex + window + 1);
  return topClans.slice(start, end);
}

/** PS99 battle/clan `members` omits the Owner — bump to real roster size. */
export function ps99RosterSize(listedMembers: number | null | undefined): number | null {
  if (listedMembers == null || !Number.isFinite(Number(listedMembers))) return null;
  const n = Number(listedMembers);
  if (n < 0) return null;
  return n + 1;
}

/** When PS99 ladder is empty / missing us, still snapshot from legacy clan payload. */
function clanRowFromLegacy(clan: LegacyClan, battleId: string): V1BattleClan {
  const battle = clan.Battles?.[battleId];
  const points = Number(battle?.Points) || 0;
  // Keep raw Members.length (excludes Owner) — same shape as battle ladder `members`.
  const members = clan.Members?.length ?? 0;
  const contributors = battle?.PointContributions?.filter((c) => (Number(c.Points) || 0) > 0)
    .length ?? 0;
  return {
    rank: battle?.Place ?? 0,
    name: clan.Name,
    icon: clan.Icon ?? "",
    countryCode: clan.CountryCode ?? "",
    members,
    memberCapacity: clan.MemberCapacity ?? ps99RosterSize(members) ?? members,
    points,
    reportedPlace: battle?.Place ?? null,
    medal: null,
    contributorCount: contributors,
  };
}

function ensureOurClanOnLadder(
  ladder: V1BattleClan[],
  ourClan: LegacyClan,
  battleId: string,
): V1BattleClan[] {
  if (ladder.some((c) => c.name === ourClan.Name)) return ladder;
  return [clanRowFromLegacy(ourClan, battleId), ...ladder];
}

export async function pollPs99(env: Env): Promise<PollResult> {
  let ops = 0;
  const capturedAt = new Date();
  const [activeBattle, ourClan] = await Promise.all([
    fetchActiveClanBattle(),
    fetchClan(env.CLAN_NAME),
  ]);

  if (!activeBattle?.configName || !ourClan) {
    console.warn("[poll] missing active battle or clan data");
    return { live: false, ops };
  }

  const battleId = activeBattle.configName;
  const battleDetail = await fetchBattleDetail(battleId);
  if (!battleDetail) {
    console.warn("[poll] battle detail unavailable", battleId);
    return { live: false, ops };
  }

  const { meta, topClans } = battleDetail;
  const live = meta.state === "live";
  const clanId = ourClan.Name;
  const userIds = rosterUserIds(ourClan);

  ops += await hydrateMemory(clanId, userIds);

  // Mark previously-live battles as past when a new battle is active
  const marked = await prisma.battle.updateMany({
    where: { state: "live", id: { not: battleId } },
    data: { state: "past" },
  });
  ops += 1;

  let archivedBattleId: string | null = null;

  if (marked.count > 0 || !live) {
    const previousLive = await prisma.battle.findMany({
      where: { state: "past", archive: null },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });
    ops += 1;
    for (const old of previousLive) {
      if (old.id === battleId) continue;
      const detail = await fetchBattleDetail(old.id);
      if (detail?.meta.state === "past") {
        const arch = await archiveBattleIfNeeded(
          env,
          old.id,
          ourClan,
          detail.topClans,
          detail.meta,
        );
        ops += arch.ops;
        if (arch.archived) archivedBattleId = old.id;
      }
    }
  }

  const placementRewardsRaw = activeBattle.configData?.PlacementRewards ?? null;
  const hasPlacementRewards = Array.isArray(placementRewardsRaw);
  const rewardsJsonValue = hasPlacementRewards
    ? (JSON.parse(JSON.stringify(placementRewardsRaw)) as Prisma.InputJsonValue)
    : undefined;

  await prisma.battle.upsert({
    where: { id: battleId },
    create: {
      id: battleId,
      title: meta.title ?? battleId,
      startTime: meta.startTime ? new Date(meta.startTime * 1000) : null,
      endTime: meta.finishTime ? new Date(meta.finishTime * 1000) : null,
      state: meta.state,
      rewardsJson: rewardsJsonValue,
    },
    update: {
      title: meta.title ?? battleId,
      startTime: meta.startTime ? new Date(meta.startTime * 1000) : null,
      endTime: meta.finishTime ? new Date(meta.finishTime * 1000) : null,
      state: meta.state,
    },
  });
  ops += 1;

  // Persist rewards once (create may have missed if API omitted config; never rewrite).
  if (rewardsJsonValue && !rewardsPersisted.has(battleId)) {
    const filled = await prisma.battle.updateMany({
      where: { id: battleId, rewardsJson: { equals: Prisma.DbNull } },
      data: { rewardsJson: rewardsJsonValue },
    });
    ops += 1;
    rewardsPersisted.add(battleId);
    if (filled.count > 0) {
      console.log(`[poll] stored placement rewards for ${battleId}`);
    }
  }

  const lastKick =
    typeof ourClan.LastKickTimestamp === "number" && Number.isFinite(ourClan.LastKickTimestamp)
      ? Math.floor(ourClan.LastKickTimestamp)
      : null;
  const ourMeta = {
    iconAssetId: extractAssetId(ourClan.Icon),
    countryCode: ourClan.CountryCode ?? null,
    memberCapacity: ourClan.MemberCapacity ?? null,
    lastKickTimestamp: lastKick,
  };
  const prevOur = clanMetaCache.get(clanId);
  const ourDirty =
    !prevOur ||
    prevOur.iconAssetId !== ourMeta.iconAssetId ||
    prevOur.countryCode !== ourMeta.countryCode ||
    prevOur.memberCapacity !== ourMeta.memberCapacity ||
    prevOur.lastKickTimestamp !== ourMeta.lastKickTimestamp;

  if (ourDirty) {
    await prisma.clan.upsert({
      where: { id: clanId },
      create: { id: clanId, isPrimary: true, ...ourMeta },
      update: { isPrimary: true, ...ourMeta },
    });
    ops += 1;
    clanMetaCache.set(clanId, ourMeta);
  }

  // Idle (no live battle): battle row + our clan + archive only — no snap spam
  if (!live) {
    ops += await pruneStaleMemberships(clanId, userIds);

    const arch = await archiveBattleIfNeeded(env, battleId, ourClan, topClans, meta);
    ops += arch.ops;
    if (arch.archived) archivedBattleId = battleId;

    if (archivedBattleId) {
      ops += await pruneSnapshots({ liveBattleId: null, archivedBattleId });
      playerSnapCache.clear();
    }

    invalidateResponseCache();
    await writePollStamp();
    const monthly = estimateMonthlyOps(ops, false, env);
    console.log(
      `[poll] ${battleId} live=false ops≈${ops} estimatedMonthlyOps≈${monthly} (idle path)`,
    );
    if (ops > 8) console.warn(`[poll] WARN idle ops ${ops} > 8`);
    return { live: false, ops };
  }

  liveTickCount += 1;
  const fullLadder = liveTickCount % env.CLAN_LADDER_FULL_EVERY === 1;
  const ladder = ensureOurClanOnLadder(
    selectLadderClans(
      topClans,
      env.CLAN_NAME,
      env.CLAN_SNAPSHOT_WINDOW,
      fullLadder,
    ),
    ourClan,
    battleId,
  );
  if (topClans.length === 0) {
    console.warn(
      `[poll] ${battleId} topClans empty from PS99 — snapshotting ${clanId} from clan endpoint only`,
    );
  }

  const newClanRows: Array<{
    id: string;
    iconAssetId: string | null;
    countryCode: string | null;
    memberCapacity: number | null;
    isPrimary: boolean;
  }> = [];

  for (const row of ladder) {
    const metaRow = {
      iconAssetId: extractAssetId(row.icon),
      countryCode: row.countryCode ?? null,
      memberCapacity: row.memberCapacity ?? null,
      lastKickTimestamp: null as number | null,
    };
    if (!clanMetaCache.has(row.name)) {
      newClanRows.push({
        id: row.name,
        iconAssetId: metaRow.iconAssetId,
        countryCode: metaRow.countryCode,
        memberCapacity: metaRow.memberCapacity,
        isPrimary: false,
      });
      clanMetaCache.set(row.name, metaRow);
    }
    // Neighbor icon/meta drift: skip per-tick updates (ops). Fresh on first see via createMany.
  }

  const pointsByUser = memberPointsMap(ourClan, battleId);
  const [avatars, displayNames] = await Promise.all([
    fetchRobloxAvatarMap(userIds),
    fetchRobloxDisplayNames(userIds),
  ]);

  const newPlayers: Array<{
    robloxUserId: bigint;
    displayName: string;
    avatarUrl: string | null;
  }> = [];
  const dirtyPlayerUpdates: Array<{
    robloxUserId: bigint;
    displayName: string;
    avatarUrl: string | null;
  }> = [];
  const newMemberships: Array<{
    clanId: string;
    robloxUserId: bigint;
    permissionLevel: number;
  }> = [];
  const dirtyMembershipUpdates: Array<{ robloxUserId: bigint; permissionLevel: number }> =
    [];
  const playerSnapRows: Array<{
    battleId: string;
    clanId: string;
    robloxUserId: bigint;
    capturedAt: Date;
    battlePoints: bigint;
  }> = [];

  const captureMs = capturedAt.getTime();
  const pendingPlayerCache = new Map<string, PlayerCache>();
  const pendingMembershipCache = new Map<string, MembershipCache>();
  const pendingPlayerSnapCache = new Map<string, PlayerSnapCache>();

  for (const userId of userIds) {
    const displayName = displayNames[userId] ?? `User ${userId}`;
    const avatarUrl = avatars[userId] ?? null;
    const perm =
      ourClan.Members?.find((m) => String(m.UserID) === userId)?.PermissionLevel ?? 0;
    const prevP = playerCache.get(userId);
    // Use DB-persisted set, not cache — failed ticks must not skip creates forever.
    if (!persistedPlayerIds.has(userId)) {
      newPlayers.push({
        robloxUserId: BigInt(userId),
        displayName,
        avatarUrl,
      });
      pendingPlayerCache.set(userId, { displayName, avatarUrl });
    } else if (!prevP || prevP.displayName !== displayName) {
      // Ignore avatar CDN URL churn — would smash ops budget every tick.
      dirtyPlayerUpdates.push({
        robloxUserId: BigInt(userId),
        displayName,
        avatarUrl,
      });
      pendingPlayerCache.set(userId, { displayName, avatarUrl });
    } else if (prevP.avatarUrl !== avatarUrl) {
      pendingPlayerCache.set(userId, { displayName, avatarUrl: prevP.avatarUrl });
    }

    const prevM = membershipCache.get(userId);
    if (!prevM) {
      newMemberships.push({
        clanId,
        robloxUserId: BigInt(userId),
        permissionLevel: perm,
      });
      pendingMembershipCache.set(userId, { permissionLevel: perm });
    } else if (prevM.permissionLevel !== perm) {
      dirtyMembershipUpdates.push({
        robloxUserId: BigInt(userId),
        permissionLevel: perm,
      });
      pendingMembershipCache.set(userId, { permissionLevel: perm });
    }

    const points = BigInt(pointsByUser.get(userId) ?? 0);
    const prevSnap = playerSnapCache.get(userId);
    const force =
      !prevSnap || captureMs - prevSnap.at >= env.PLAYER_SNAP_FORCE_MS;
    const changed = !prevSnap || prevSnap.points !== points;
    if (changed || force) {
      playerSnapRows.push({
        battleId,
        clanId,
        robloxUserId: BigInt(userId),
        capturedAt,
        battlePoints: points,
      });
      pendingPlayerSnapCache.set(userId, { points, at: captureMs });
    }
  }

  const clanSnapRows = ladder.map((row) => ({
    battleId,
    clanId: row.name,
    capturedAt,
    battlePoints: BigInt(row.points),
    rank: row.rank,
    // Our live roster already includes Owner; other clans: ladder omits Owner → +1.
    memberCount:
      row.name === clanId && userIds.length > 0
        ? userIds.length
        : ps99RosterSize(row.members),
    contributorCount: row.contributorCount ?? null,
  }));

  await prisma.$transaction(async (tx) => {
    if (newClanRows.length) {
      await tx.clan.createMany({ data: newClanRows, skipDuplicates: true });
    }
    // Players must exist before memberships / player snapshots (FK).
    if (newPlayers.length) {
      await tx.player.createMany({ data: newPlayers, skipDuplicates: true });
    }
    for (const p of dirtyPlayerUpdates) {
      await tx.player.update({
        where: { robloxUserId: p.robloxUserId },
        data: { displayName: p.displayName, avatarUrl: p.avatarUrl },
      });
    }
    if (newMemberships.length) {
      await tx.clanMembership.createMany({
        data: newMemberships,
        skipDuplicates: true,
      });
    }
    for (const m of dirtyMembershipUpdates) {
      await tx.clanMembership.update({
        where: {
          clanId_robloxUserId: { clanId, robloxUserId: m.robloxUserId },
        },
        data: { permissionLevel: m.permissionLevel },
      });
    }
    // Keep roster = current PS99 members (capacity 75; leavers must drop).
    if (userIds.length > 0) {
      await tx.clanMembership.deleteMany({
        where: {
          clanId,
          robloxUserId: { notIn: userIds.map((id) => BigInt(id)) },
        },
      });
    }
    await tx.clanBattleSnapshot.createMany({ data: clanSnapRows });
    if (playerSnapRows.length) {
      await tx.playerPointSnapshot.createMany({ data: playerSnapRows });
    }
  });

  for (const [id, row] of pendingPlayerCache) playerCache.set(id, row);
  for (const [id, row] of pendingMembershipCache) membershipCache.set(id, row);
  for (const [id, row] of pendingPlayerSnapCache) playerSnapCache.set(id, row);
  for (const p of newPlayers) persistedPlayerIds.add(String(p.robloxUserId));
  const activeMembers = new Set(userIds);
  for (const id of [...membershipCache.keys()]) {
    if (!activeMembers.has(id)) membershipCache.delete(id);
  }

  // Count transaction queries for ops estimate (Accelerate bills each statement)
  ops += 1; // createMany clan snaps (always)
  if (newClanRows.length) ops += 1;
  if (playerSnapRows.length) ops += 1;
  if (newPlayers.length) ops += 1;
  ops += dirtyPlayerUpdates.length;
  if (newMemberships.length) ops += 1;
  ops += dirtyMembershipUpdates.length;
  if (userIds.length > 0) ops += 1; // membership prune deleteMany

  // Periodic prune every full-ladder tick
  if (fullLadder) {
    ops += await pruneSnapshots({
      liveBattleId: battleId,
      archivedBattleId,
    });
  } else if (archivedBattleId) {
    ops += await pruneSnapshots({
      liveBattleId: null,
      archivedBattleId,
    });
  }

  invalidateResponseCache();
  await writePollStamp();

  const withPoints = [...pointsByUser.values()].filter((p) => p > 0).length;
  const monthly = estimateMonthlyOps(ops, true, env);
  console.log(
    `[poll] ${battleId} live=true ops≈${ops} clanSnaps=${clanSnapRows.length} playerSnaps=${playerSnapRows.length} members=${userIds.length} contributors=${withPoints} fullLadder=${fullLadder} estimatedMonthlyOps≈${monthly}`,
  );
  if (ops > 8) {
    console.warn(`[poll] WARN warm tick ops ${ops} > 8 (goal ≤6)`);
  }

  return { live: true, ops };
}
