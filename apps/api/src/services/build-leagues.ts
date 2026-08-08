import type { LeaguesResponse } from "@k0ii/schemas";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Env } from "../env";

type LeagueNameRow = { name?: string; Name?: string };
type LeagueHistoryRow = {
  name?: string;
  rank?: number;
  points?: number;
  pph?: number;
};

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function dataDir(): string {
  return path.resolve(import.meta.dir, "../../../../data");
}

export async function buildLeaguesResponse(env: Env): Promise<LeaguesResponse> {
  const dir = dataDir();
  const names =
    (await readJsonSafe<LeagueNameRow[]>(
      path.join(dir, "league-names.json"),
    )) ?? [];
  const history =
    (await readJsonSafe<Record<string, LeagueHistoryRow[]>>(
      path.join(dir, "league-history.json"),
    )) ?? {};

  const trackedNames = names
    .map((n) => n.name ?? n.Name ?? "")
    .filter(Boolean)
    .slice(0, 40);

  const tracked = trackedNames.map((name) => {
    const series = history[name] ?? [];
    const latest = series[series.length - 1];
    return {
      name,
      rank: latest?.rank ?? null,
      points: latest?.points ?? null,
      pph: latest?.pph ?? null,
      delta5m: null,
      contributorCount: null,
      isOurs: name.toLowerCase() === env.CLAN_NAME.toLowerCase(),
    };
  });

  // Build top100 from latest snapshot across all history keys
  const latestByClan = Object.entries(history).map(([name, series]) => {
    const latest = series[series.length - 1];
    return {
      name,
      rank: latest?.rank ?? null,
      points: latest?.points ?? 0,
      pph: latest?.pph ?? null,
      delta5m: null,
      contributorCount: null,
      isOurs: name.toLowerCase() === env.CLAN_NAME.toLowerCase(),
    };
  });

  const top100 = latestByClan
    .filter((c) => c.rank != null || c.points > 0)
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || b.points - a.points)
    .slice(0, 100)
    .map((c) => ({ ...c, points: c.points || null }));

  return {
    generatedAt: Date.now(),
    tracked: tracked.length ? tracked : top100.slice(0, 20),
    top100,
  };
}
