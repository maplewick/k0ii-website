import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { loadEnv } from "./env";
import { cachedJson } from "./lib/response-cache";
import {
  buildBattleArchiveResponse,
  buildBattleDetail,
} from "./services/build-archive";
import { buildGlobalLeaderboardResponse } from "./services/build-global";
import { buildGraphsResponse } from "./services/build-graphs";
import { buildLeaderboardsResponse } from "./services/build-leaderboards";
import { buildLeaguesResponse } from "./services/build-leagues";
import { buildBattleRewardsResponse } from "./services/build-rewards";
import { buildRegistryResponse } from "./services/build-registry";
import { buildRosterResponse } from "./services/build-roster";

export function createApp(env: Env) {
  const app = new Hono();
  const cacheMs = env.ROSTER_CACHE_MS;

  app.use(
    "*",
    cors({
      origin: env.corsOrigins,
      allowMethods: ["GET", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/api/roster", async (c) => {
    try {
      return c.json(
        await cachedJson("roster", cacheMs, () => buildRosterResponse(env)),
      );
    } catch (error) {
      console.error("[roster]", error);
      return c.json({ error: "Failed to build roster" }, 500);
    }
  });

  app.get("/api/leaderboards", async (c) => {
    try {
      return c.json(
        await cachedJson("leaderboards", cacheMs, () =>
          buildLeaderboardsResponse(env),
        ),
      );
    } catch (error) {
      console.error("[leaderboards]", error);
      return c.json({ error: "Failed to build leaderboards" }, 500);
    }
  });

  app.get("/api/battle-rewards", async (c) => {
    try {
      // Short TTL so placement sync from PS99 shows up quickly.
      return c.json(
        await cachedJson("battle-rewards", Math.min(cacheMs, 60_000), () =>
          buildBattleRewardsResponse(),
        ),
      );
    } catch (error) {
      console.error("[battle-rewards]", error);
      return c.json({ error: "Failed to build battle rewards" }, 500);
    }
  });

  app.get("/api/registry", async (c) => {
    try {
      return c.json(
        await cachedJson("registry", cacheMs, () => buildRegistryResponse(env)),
      );
    } catch (error) {
      console.error("[registry]", error);
      return c.json({ error: "Failed to build registry" }, 500);
    }
  });

  app.get("/api/battle-archive", async (c) => {
    try {
      return c.json(await buildBattleArchiveResponse(env));
    } catch (error) {
      console.error("[battle-archive]", error);
      return c.json({ error: "Failed to build battle archive" }, 500);
    }
  });

  app.get("/api/battles/:id", async (c) => {
    try {
      const detail = await buildBattleDetail(env, c.req.param("id"));
      if (!detail) return c.json({ error: "Battle not found" }, 404);
      return c.json(detail);
    } catch (error) {
      console.error("[battle-detail]", error);
      return c.json({ error: "Failed to build battle detail" }, 500);
    }
  });

  app.get("/api/graphs", async (c) => {
    try {
      const hours = Number(c.req.query("hours") ?? 12);
      const clamped = Math.min(
        48,
        Math.max(1, Number.isFinite(hours) ? hours : 12),
      );
      return c.json(
        await cachedJson(`graphs:${clamped}`, cacheMs, () =>
          buildGraphsResponse(env, clamped),
        ),
      );
    } catch (error) {
      console.error("[graphs]", error);
      return c.json({ error: "Failed to build graphs" }, 500);
    }
  });

  app.get("/api/leagues", async (c) => {
    try {
      return c.json(await buildLeaguesResponse(env));
    } catch (error) {
      console.error("[leagues]", error);
      return c.json({ error: "Failed to build leagues" }, 500);
    }
  });

  app.get("/api/global-leaderboard", async (c) => {
    try {
      const q = c.req.query("q") ?? "";
      const clan = c.req.query("clan") ?? "";
      const limit = Number(c.req.query("limit") ?? 50);
      const offset = Number(c.req.query("offset") ?? 0);
      const cacheKey = `global:${q}:${clan}:${limit}:${offset}`;
      return c.json(
        await cachedJson(cacheKey, cacheMs, () =>
          buildGlobalLeaderboardResponse(env, {
            q: q || undefined,
            clan: clan || undefined,
            limit,
            offset,
          }),
        ),
      );
    } catch (error) {
      console.error("[global]", error);
      return c.json({ error: "Failed to build global leaderboard" }, 500);
    }
  });

  return app;
}

const env = loadEnv();
const app = createApp(env);
const port = env.API_PORT;

console.log(`[api] listening on http://localhost:${port}`);
Bun.serve({ port, fetch: app.fetch });
