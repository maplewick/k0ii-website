# KOii Website (v2)

Rebuild of the K0ii clan war dashboard. Turborepo monorepo inside the parent `k0ii-clan` repo — self-contained so it can move to its own repo later.

**Stack:** Bun, Turborepo, Next.js 16 (`apps/web`), Hono + Prisma (`apps/api`), shared Zod schemas (`packages/schemas`).

**Data:** Backend polls [PS99 Public API](https://github.com/BIG-Games-LLC/ps99-public-api-docs) on an interval, stores snapshots in Prisma Postgres (Accelerate in production), serves `GET /api/roster` to the frontend. Frontend never calls PS99 directly.

**Design:** Follow [`designGuide.md`](./designGuide.md) (copied from repo root).

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

## Docs

- PS99 API: https://github.com/BIG-Games-LLC/ps99-public-api-docs
- `apps/web/README.md` — frontend
- `apps/api/README.md` — backend, Prisma, polling

## Env vars

See [`.env.example`](./.env.example). Primary clan is `K0i2`.
