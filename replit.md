# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/api-server run test` — run the authorization/regression test suite (supertest against the real Express app, hits the dev database)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `artifacts/api-server` has an automated authorization test suite (`pnpm --filter @workspace/api-server run test`, vitest + supertest) covering ownership/admin/scoping checks for property-listings, land, mobility, construction, marketplace, and youth routes. It runs against the real dev `DATABASE_URL` (no separate test DB) and creates uniquely-emailed throwaway users per run — always run it after touching `isOwnerOrAdmin` usage or route auth checks to catch regressions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
