import { z } from "zod";

const DEFAULT_WEB_ORIGINS = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
] as const;

const envSchema = z.object({
  CLAN_NAME: z.string().default("K0i2"),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),
  API_PORT: z.coerce.number().default(3002),
  /** Railway / hosts inject PORT — preferred when set. */
  PORT: z.coerce.number().optional(),
  /**
   * Comma-separated browser origins allowed to call the API (CORS).
   * Always merges localhost:3001 for local Next. Set production Vercel URL(s) here.
   */
  WEB_ORIGINS: z.string().optional(),
  /** Live battle poll cadence. Free tier default: 5 min. */
  POLL_INTERVAL_MS: z.coerce.number().default(300_000),
  /** No live battle — detect next war only. Default: 30 min. */
  POLL_INTERVAL_IDLE_MS: z.coerce.number().default(1_800_000),
  /** In-memory API response cache TTL (ms). Match live poll. */
  ROSTER_CACHE_MS: z.coerce.number().default(300_000),
  /** Clan ranks around us to snapshot every tick. */
  CLAN_SNAPSHOT_WINDOW: z.coerce.number().default(10),
  /** Full top-50 ladder every N live ticks (~30 min at 5 min poll). */
  CLAN_LADDER_FULL_EVERY: z.coerce.number().default(6),
  /** Force a player snap even if points flat (ms). Default: 15 min. */
  PLAYER_SNAP_FORCE_MS: z.coerce.number().default(900_000),
  /** Top N clans (by Points) for global player index. File-backed — 0 Accelerate. */
  GLOBAL_INDEX_CLAN_LIMIT: z.coerce.number().default(500),
  /** Global index refresh while battle live. Default: 30 min. */
  GLOBAL_INDEX_REFRESH_MS: z.coerce.number().default(1_800_000),
  /** Concurrent /api/clan fetches during global index build. */
  GLOBAL_INDEX_FETCH_CONCURRENCY: z.coerce.number().default(6),
});

export type Env = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  listenPort: number;
};

function parseWebOrigins(raw: string | undefined): string[] {
  const extras = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((origin) => {
      try {
        const u = new URL(origin);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    });
  return [...new Set([...DEFAULT_WEB_ORIGINS, ...extras])];
}

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return {
    ...parsed.data,
    corsOrigins: parseWebOrigins(parsed.data.WEB_ORIGINS),
    listenPort: parsed.data.PORT ?? parsed.data.API_PORT,
  };
}
