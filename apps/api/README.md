# @k0ii/api

Hono HTTP API + PS99 poll job for the KOii roster rebuild.

## Run

```bash
# From k0ii-website/apps/api — uses ../../.env automatically via package scripts
bun install                        # from k0ii-website root
bun run db:generate
bun run db:push

cd apps/api
bun run dev      # API on :3002
bun run poll     # PS99 ingest loop (separate process)
```

## Stack

- Bun, Hono, Prisma ORM, PostgreSQL (Accelerate URL in `DATABASE_URL`)
- Live poll: `POLL_INTERVAL_MS` (default **300000** = 5 min)
- Idle poll: `POLL_INTERVAL_IDLE_MS` (default **1800000** = 30 min)
- Tracked clan: `CLAN_NAME` (default `K0i2`)

## Free-tier budget (100k Accelerate ops / month)

| Slice                          | Ops          | Notes                             |
| ------------------------------ | ------------ | --------------------------------- |
| Monthly cap                    | 100,000      | Hard                              |
| Safety buffer                  | 40,000       | Headroom / local / future leagues |
| Usable                         | 60,000       |                                   |
| Live poll (5 min, ≤6 ops/tick) | ~24k / month | ~14 battle-days                   |
| Idle poll (30 min)             | ~3–8k        | Detect next war only              |
| **Estimate total**             | **~30–35k**  | Leaves fat headroom               |

Design rules:

- **Batch-first** writes (`createMany`, one `$transaction`, skip unchanged)
- Windowed clan snaps; full top-50 every `CLAN_LADDER_FULL_EVERY` ticks
- Skip flat player snaps unless `PLAYER_SNAP_FORCE_MS` elapsed
- In-memory cache for `/api/roster`, `/api/leaderboards`, `/api/graphs` until next poll
- **Global leaderboard is file-backed** (`data/global-player-index.json`) — **0 Accelerate ops**. Cost is PS99 rate limits only. Refreshes every `GLOBAL_INDEX_REFRESH_MS` while live (default 30 min), top `GLOBAL_INDEX_CLAN_LIMIT` clans (default 500).
- **Leagues poll deferred** — quiet weeks later; idle path does not ingest leagues

Upgrade Prisma plan later if you need sub-5-minute live polls.

## HTTP routes

| Method | Path                       | Description                                      |
| ------ | -------------------------- | ------------------------------------------------ |
| GET    | `/health`                  | Liveness                                         |
| GET    | `/api/roster`              | Full roster payload (battle, neighbors, members) |
| GET    | `/api/leaderboards`        | Clan ladder + PPH                                |
| GET    | `/api/graphs`              | Points/rank series                               |
| GET    | `/api/battle-archive`      | Past battles                                     |
| GET    | `/api/leagues`             | League board (file/cache; no free-tier poll yet) |
| GET    | `/api/global-leaderboard`  | Cross-clan players (JSON index; not Prisma snaps)|
| GET    | `/api/battle-rewards`      | Clan podium + PS99 placement rewards             |
| GET    | `/api/registry`            | Staff registry                                   |

## Poll job

`src/jobs/scheduler.ts` adaptive loop:

1. `GET /api/activeClanBattle` — current battle id
2. `GET /api/clan/{CLAN_NAME}` — authoritative roster + member battle points
3. `GET /v1/clans/battles/{battleId}` — top clans, ranks, battle meta

**Live:** batched `ClanBattleSnapshot` + changed `PlayerPointSnapshot` rows.  
**Idle:** battle/clan upsert + archive only — no snap spam.  
**Rewards:** `PlacementRewards` from active battle config written once to `Battle.rewardsJson`; `/api/battle-rewards` reads DB (cached).  
**Global index (separate cadence):** while live, every `GLOBAL_INDEX_REFRESH_MS`, fan-out `/api/clans` + `/api/clan/{name}` for top N clans’ `PointContributions` → write `data/global-player-index.json`. Does **not** write Prisma player snaps. Fire-and-forget so it never blocks the 5‑min poll tick.

Logs each tick: `ops≈N` and `estimatedMonthlyOps≈N`.

Run as `bun run poll` alongside `bun run dev`. On Railway, run poll as a second service.

## Prisma

Schema: `prisma/schema.prisma`

```bash
bun run db:generate   # generate client
bun run db:push       # prototype / dev
bun run db:migrate    # migration workflow
```

Uses `DATABASE_URL` (Accelerate) and `DIRECT_DATABASE_URL` (direct Postgres for migrations).

## Folder structure

```
src/
├── index.ts                 Hono app entry
├── env.ts                   Zod-validated env
├── jobs/scheduler.ts        Adaptive poll + global index cadence
├── lib/prisma.ts            Prisma client
├── lib/response-cache.ts    In-memory GET cache
└── services/
    ├── ps99-client.ts       PS99 + Roblox fetch helpers
    ├── poll-ps99.ts         Batch ingest tick
    ├── refresh-global-index.ts  File-backed global player index
    ├── prune-snapshots.ts   Retention deletes
    ├── build-roster.ts      GET /api/roster assembly
    ├── build-global.ts      GET /api/global-leaderboard
    ├── stats.ts             PPH, deltas, inactivity
    └── comparison.ts        3 above / 3 below window
```

## Env

| Variable                          | Required | Default   | Purpose                                |
| --------------------------------- | -------- | --------- | -------------------------------------- |
| `DATABASE_URL`                    | yes      | —         | Prisma connection (Accelerate in prod) |
| `DIRECT_DATABASE_URL`             | yes\*    | —         | Direct URL for migrations              |
| `CLAN_NAME`                       | no       | `K0i2`    | Clan to track                          |
| `API_PORT`                        | no       | `3002`    | HTTP port                              |
| `POLL_INTERVAL_MS`                | no       | `300000`  | Live poll cadence (5 min)              |
| `POLL_INTERVAL_IDLE_MS`           | no       | `1800000` | Idle poll cadence (30 min)             |
| `ROSTER_CACHE_MS`                 | no       | `300000`  | API response cache TTL                 |
| `CLAN_SNAPSHOT_WINDOW`            | no       | `10`      | Rank window around us each tick        |
| `CLAN_LADDER_FULL_EVERY`          | no       | `6`       | Full top-50 every N live ticks         |
| `PLAYER_SNAP_FORCE_MS`            | no       | `900000`  | Force player snap if flat (15 min)     |
| `GLOBAL_INDEX_CLAN_LIMIT`         | no       | `500`     | Top clans indexed for Global page      |
| `GLOBAL_INDEX_REFRESH_MS`         | no       | `1800000` | Global index refresh while live        |
| `GLOBAL_INDEX_FETCH_CONCURRENCY`  | no       | `6`       | Parallel `/api/clan` fetches           |

\*Required when using Accelerate.

## PS99 notes

- Own clan points: legacy `/api/clan/{name}` (authoritative member contributions)
- Neighbor ranks: v1 `/v1/clans/battles/{id}` `topClans`
- Global index: `/api/clans` + fan-out `/api/clan/{name}` (default top 500, concurrency 6, every 30 min live) — watch **100 req/min** PS99 limit; does not use Accelerate
- Rate limit: 100 req/min per IP — 5 min poll + few calls/tick is safe; global refresh spreads clan fetches over ~1–2 min
