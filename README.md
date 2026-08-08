# KOii Website (v2)

Rebuild of the K0ii clan war dashboard. Turborepo monorepo (`apps/web`, `apps/api`, `packages/schemas`).

**Stack:** Bun, Turborepo, Next.js 16 (`apps/web`), Hono + Prisma (`apps/api`), shared Zod schemas (`packages/schemas`).

**Data:** Backend polls [PS99 Public API](https://github.com/BIG-Games-LLC/ps99-public-api-docs) on an interval, stores snapshots in Prisma Postgres (Accelerate optional), serves `GET /api/roster` to the frontend. Frontend never calls PS99 directly.

**Design:** Follow [`designGuide.md`](./designGuide.md).

**v1 scope:** Roster dashboard only — stat strip, 3 above / 3 below neighbor comparison, sortable member table.

## Layout

```
k0ii-website/
├── apps/web/          Next.js frontend (:3001)
├── apps/api/          Hono API + poll job (:3002)
├── packages/schemas/  Shared Zod types
└── designGuide.md
```

Old `bot.js` / `web/` at repo root are reference only. Do not import from them.

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- Prisma Postgres database (local Postgres or [Prisma Postgres](https://www.prisma.io/docs/postgres) + Accelerate)

## Setup

```bash
# From k0ii-website root — env lives in k0ii-website/.env (not apps/api/)
cp .env.example .env
bun install
bun run db:generate
bun run db:push   # or: bun run db:migrate
```

## Run locally

Three terminals (or use turbo for web + api only):

```bash
# Terminal 1 — API
cd apps/api && bun run dev

# Terminal 2 — PS99 poll job (60s default)
cd apps/api && bun run poll

# Terminal 3 — Frontend
cd apps/web && bun run dev
```

Or from monorepo root:

```bash
bun run dev          # web + api (turbo)
# Poll job still separate: cd apps/api && bun run poll
```

Open http://localhost:3001/roster

## Railway demo (one project, one environment)

Demo / share stack — not production hardening. Use **one Railway project** with **shared variables**, three services from the same GitHub repo:

| Service | Role | Start |
| --- | --- | --- |
| `web` | Next.js | `bun run start` in `apps/web` (after monorepo build) |
| `api` | Hono HTTP | `bun run start` in `apps/api` |
| `poll` | PS99 ingest + global index | `bun run poll` in `apps/api` |

### 1. Connect repo

Railway → New Project → Deploy from GitHub → `myjak/K0ii-website`.

### 2. Shared env (Project → Variables, or share across services)

Copy from local `.env.example` / your machine `.env` (never commit secrets):

- `DATABASE_URL` / `DIRECT_DATABASE_URL` (same Prisma Postgres / Accelerate as local is fine for demo)
- `CLAN_NAME=K0i2`
- Poll / global knobs as needed
- On **api**: `WEB_ORIGINS=https://YOUR-WEB.up.railway.app` (no trailing slash; or `*` for demo)
- On **web** (preferred — avoids browser CORS):
  - `API_UPSTREAM_URL=https://YOUR-API.up.railway.app`
  - `NEXT_PUBLIC_API_SAME_ORIGIN=1`
  - (optional) keep `NEXT_PUBLIC_API_URL` as the api URL for SSR fallback only

### 3. Service settings (all: Root Directory = `/`, Builder = Railpack / Nixpacks with Bun)

**api**

- Build: `bun install && bun run db:generate`
- Start: `cd apps/api && bun run start`
- Generate public domain; Railway sets `PORT` (API already prefers `PORT` over `API_PORT`)
- One-shot after first deploy: `cd apps/api && bunx prisma db push` (or migrate) via Railway shell if schema empty

**poll**

- Same build as api (or skip heavy build if image already has deps — simplest: duplicate api build)
- Start: `cd apps/api && bun run poll`
- No public domain needed
- Global index lives in Postgres (`GlobalPlayerIndexSnapshot`) — no shared volume needed between poll and api
- Optional local `data/` for poll-stamp / file mirrors only

**web**

- Build: `bun install && bunx turbo build --filter=@k0ii/web`
- Start: `cd apps/web && bun run start`
- Set `PORT` / Next listens on Railway `PORT` — if Next ignores it, set Start to `cd apps/web && bunx next start --port $PORT`
- Public domain = what you share with others

### 4. Wire frontend → api

1. Deploy api → copy public URL (`https://…up.railway.app`)  
2. On **web**: set `API_UPSTREAM_URL` to that URL + `NEXT_PUBLIC_API_SAME_ORIGIN=1` → redeploy web  
3. On **api**: set `WEB_ORIGINS` to the web public URL (or `*`) → redeploy api  

Browser calls `/api/…` on the web origin; `apps/web/src/app/api/[...path]/route.ts` proxies to the api service at runtime (so `API_UPSTREAM_URL` need not exist at build time). Rewards / Global / Leagues are client-only and need this (or working CORS).

### Notes

- One environment = don’t create production/staging splits; keep this project as **demo**.
- Accelerate ops still apply if you use Accelerate `DATABASE_URL`.
- Local folder `d:\Github\k0ii-clan\k0ii-website` is a copy; ongoing work should use `d:\Github\K0ii-website` (this repo).

## Docs

- PS99 API: https://github.com/BIG-Games-LLC/ps99-public-api-docs
- `apps/web/README.md` — frontend
- `apps/api/README.md` — backend, Prisma, polling

## Env vars

See [`.env.example`](./.env.example). Primary clan is `K0i2`.
