/**
 * Cross-clan global player index — Postgres singleton (shared poll ↔ api).
 * Local JSON mirror kept for offline/dev fallback only.
 * Ports bot refreshGlobalPlayerIndex: top N clans × PointContributions.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Env } from "../env";
import { prisma } from "../lib/prisma";
import {
  fetchActiveClanBattle,
  fetchBattleDetail,
  fetchClan,
  fetchClansPage,
} from "./ps99-client";

export type GlobalIndexPlayer = {
  points: number;
  clanName: string;
  rank: number;
};

export type GlobalPlayerIndex = {
  updatedAt: number;
  battleId: string;
  totalPlayers: number;
  clansIndexed: number;
  players: Record<string, GlobalIndexPlayer>;
};

const SNAPSHOT_ID = "current";

function dataDir(): string {
  return path.resolve(import.meta.dir, "../../../../data");
}

export function globalIndexPath(): string {
  return path.join(dataDir(), "global-player-index.json");
}

let inFlight = false;
let memoryIndex: GlobalPlayerIndex | null = null;
let memoryLoadedAt = 0;
/** API process re-reads DB periodically (poller writes from another process). */
const MEMORY_TTL_MS = 30_000;

function asIndex(raw: unknown): GlobalPlayerIndex | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as GlobalPlayerIndex;
  if (!parsed.players || typeof parsed.battleId !== "string") return null;
  if (typeof parsed.totalPlayers !== "number") return null;
  return parsed;
}

async function loadFromFile(): Promise<GlobalPlayerIndex | null> {
  try {
    const raw = await readFile(globalIndexPath(), "utf8");
    return asIndex(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function mirrorToFile(index: GlobalPlayerIndex): Promise<void> {
  try {
    const dir = dataDir();
    await mkdir(dir, { recursive: true });
    await writeFile(globalIndexPath(), JSON.stringify(index), "utf8");
  } catch (error) {
    console.warn("[global-index] local file mirror skipped", error);
  }
}

export async function loadGlobalPlayerIndex(): Promise<GlobalPlayerIndex | null> {
  if (memoryIndex && Date.now() - memoryLoadedAt < MEMORY_TTL_MS) {
    return memoryIndex;
  }

  try {
    const row = await prisma.globalPlayerIndexSnapshot.findUnique({
      where: { id: SNAPSHOT_ID },
    });
    const fromDb = asIndex(row?.payload);
    if (fromDb) {
      memoryIndex = fromDb;
      memoryLoadedAt = Date.now();
      return fromDb;
    }
  } catch (error) {
    console.error("[global-index] DB read failed", error);
  }

  // Dev / first boot: hydrate from local file if DB empty.
  const fromFile = await loadFromFile();
  if (fromFile) {
    memoryIndex = fromFile;
    memoryLoadedAt = Date.now();
    try {
      await prisma.globalPlayerIndexSnapshot.upsert({
        where: { id: SNAPSHOT_ID },
        create: { id: SNAPSHOT_ID, payload: fromFile },
        update: { payload: fromFile },
      });
      console.log(
        `[global-index] seeded DB from local file (${fromFile.totalPlayers} players)`,
      );
    } catch (error) {
      console.warn("[global-index] could not seed DB from file", error);
    }
    return fromFile;
  }

  return null;
}

async function saveGlobalPlayerIndex(index: GlobalPlayerIndex): Promise<void> {
  await prisma.globalPlayerIndexSnapshot.upsert({
    where: { id: SNAPSHOT_ID },
    create: { id: SNAPSHOT_ID, payload: index },
    update: { payload: index },
  });
  await mirrorToFile(index);
  memoryIndex = index;
  memoryLoadedAt = Date.now();
}

async function resolveLiveBattleId(): Promise<string | null> {
  const active = await fetchActiveClanBattle();
  if (!active?.configName) return null;
  const detail = await fetchBattleDetail(active.configName);
  if (detail?.meta.state === "live") return active.configName;
  return null;
}

export type GlobalIndexRefreshResult = {
  ran: boolean;
  skipped?: string;
  battleId?: string;
  clansIndexed?: number;
  totalPlayers?: number;
  durationMs?: number;
};

/**
 * Rebuild global index when a battle is live. Persist to Postgres so api/web see it.
 */
export async function refreshGlobalPlayerIndex(
  env: Env,
): Promise<GlobalIndexRefreshResult> {
  if (inFlight) return { ran: false, skipped: "in-flight" };
  inFlight = true;
  const started = Date.now();

  try {
    const battleId = await resolveLiveBattleId();
    if (!battleId) {
      return { ran: false, skipped: "no-live-battle" };
    }

    const limit = env.GLOBAL_INDEX_CLAN_LIMIT;
    const pageSize = Math.min(100, limit);
    const clanNames: string[] = [];
    let page = 1;
    while (clanNames.length < limit) {
      const remaining = limit - clanNames.length;
      const chunk = await fetchClansPage({
        page,
        pageSize: Math.min(pageSize, remaining),
        sort: "Points",
        sortOrder: "desc",
      });
      if (!chunk?.length) break;
      for (const row of chunk) {
        if (row.Name) clanNames.push(String(row.Name));
        if (clanNames.length >= limit) break;
      }
      if (chunk.length < pageSize) break;
      page += 1;
    }

    if (!clanNames.length) {
      return { ran: false, skipped: "empty-clan-list", battleId };
    }

    const players: Record<
      string,
      { points: number; clanName: string }
    > = {};
    let cursor = 0;
    const concurrency = Math.max(1, env.GLOBAL_INDEX_FETCH_CONCURRENCY);

    async function worker() {
      while (cursor < clanNames.length) {
        const name = clanNames[cursor++]!;
        const detail = await fetchClan(name);
        const contribs = detail?.Battles?.[battleId!]?.PointContributions;
        if (!Array.isArray(contribs) || !contribs.length) continue;
        const clanLabel = String(detail?.Name ?? name);
        for (const c of contribs) {
          const id = String(c?.UserID ?? "").trim();
          if (!id || !/^\d+$/.test(id)) continue;
          const points = Number(c.Points) || 0;
          const prev = players[id];
          // Same user in multiple clans: keep highest points row.
          if (!prev || points > prev.points) {
            players[id] = { points, clanName: clanLabel };
          }
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, clanNames.length) }, () =>
        worker(),
      ),
    );

    const ranked = Object.entries(players).sort(
      (a, b) => b[1].points - a[1].points,
    );
    const indexed: Record<string, GlobalIndexPlayer> = {};
    ranked.forEach(([id, rec], i) => {
      indexed[id] = {
        points: rec.points,
        clanName: rec.clanName,
        rank: i + 1,
      };
    });

    const index: GlobalPlayerIndex = {
      updatedAt: Date.now(),
      battleId,
      totalPlayers: ranked.length,
      clansIndexed: clanNames.length,
      players: indexed,
    };
    await saveGlobalPlayerIndex(index);

    const durationMs = Date.now() - started;
    console.log(
      `[global-index] ${battleId}: ${ranked.length} players across ${clanNames.length} clans in ${durationMs}ms (postgres)`,
    );

    return {
      ran: true,
      battleId,
      clansIndexed: clanNames.length,
      totalPlayers: ranked.length,
      durationMs,
    };
  } finally {
    inFlight = false;
  }
}
