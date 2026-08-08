# @k0ii/web

Next.js 16 frontend for the KOii roster dashboard.

## Run

```bash
# From k0ii-website/apps/web
cp ../../.env.example ../../.env   # if not done at monorepo root
bun install                        # from k0ii-website root
bun run dev                        # http://localhost:3001
```

Requires the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:3002`).

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 — pond tokens in `src/app/globals.css`
- `@k0ii/schemas` for API response validation
- `next-themes` for day/night pond

Not wired yet in v1: nuqs URL state, TanStack Query client-side refresh, shadcn full component set. Roster page uses server fetch + client table sort.

## Folder structure

```
src/
├── app/
│   ├── layout.tsx      Root layout, Fredoka + Manrope
│   ├── page.tsx        Redirects to /roster
│   ├── roster/page.tsx Main war dashboard
│   └── globals.css     Pond design tokens (see designGuide.md)
├── components/
│   └── roster/         Stat strip, comparison, table
└── lib/
    ├── api/client.ts   fetchRoster() → GET /api/roster
    └── format.ts       Points, PPH, duration formatters
```

## Data source

All roster data from **our API** (`apps/api`), not PS99. See `src/lib/api/client.ts`.

## Env

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | Backend base URL |

## Design

Follow [`../../designGuide.md`](../../designGuide.md). Operate surfaces stay dense; pond styling lives in cards/tables, not gray dashboards.
