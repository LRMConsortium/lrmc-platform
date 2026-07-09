# LRMC — Legacy Rental Management Consortium

A multi-sector demo prototype for a fictional Gambian institution spanning membership, mobility (Ususu rideshare), land & construction, marketplace/e-commerce, youth employment, treasury/risk/settlement, and internal messaging — with separate member and admin experiences.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `node lib/db/scripts/seed.mjs` — seed demo data (raw SQL via `pg`, idempotent-ish; re-running will duplicate rows)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, auth via Replit Auth (OIDC, `@workspace/replit-auth-web` on the client)
- DB: PostgreSQL + Drizzle ORM (22 tables)
- Validation: Zod (`zod/v3` — pinned in the catalog), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `@workspace/api-client-react` hooks
- Frontend: React + Vite, wouter routing, Tailwind + shadcn/ui
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/*` — Drizzle table definitions (one file per domain)
- `lib/db/scripts/seed.mjs` — demo data seed script
- `artifacts/api-server/src/routes/*` — one Express router file per domain (memberships, assets, land, construction, ususu, payments, ads, marketplace, ecommerce, youth, prospecting, intranet, treasury, risk, settlement, dashboard, auth)
- `artifacts/api-server/src/middlewares/authz.ts` — `requireAuth` / `requireAdmin` guards
- `artifacts/web/src/pages/` — member-facing pages at the root, admin-facing pages under `admin/`
- OpenAPI spec is the source of truth for request/response shapes; regenerate the client after editing it

## Architecture decisions

- Single `assets` table with a `kind` discriminator (vehicle/equipment/property) instead of separate tables per asset type.
- Status/kind/category fields are plain validated strings, not Postgres enums, to keep the schema flexible during rapid iteration.
- All financial rails (treasury, settlement, risk, payments) are simulated ledger data — no real banking or payment processor integration.
- `usersTable` (Replit Auth template) was extended with `role` (`admin`|`member`) and `phone` for role-gated multi-persona UX.
- Ride completion and digital-product purchase run inside DB transactions with a conditional status-guarded update, to avoid double-settlement under concurrent requests.
- Every route enforces authorization server-side via `requireAuth`/`requireAdmin` (see Gotchas) — client-side role checks are UX only, never the security boundary.

## Product

- **Public storefront**: marketing home, sector overview, Ususu mobility landing.
- **Member portal**: memberships, owned assets, land marketplace, construction contractor/project tracking, Ususu rides, general marketplace, digital product store, youth employment applications, payments history, profile.
- **Admin console**: approval queues embedded in each sector page (memberships, drivers, contractors, land transactions), Treasury console (accounts, ledger, risk events, settlements, audit log), Prospect CRM, Intranet (internal messages/tickets), aggregate admin dashboard.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Seeded demo users (`seed-admin-1`, `seed-member-1..6`) are synthetic and not tied to real Replit accounts. A real login defaults to `role: member`; promote to `admin` via a direct SQL update on `users.role` to test the admin experience.
- Every route file must import `requireAuth`/`requireAdmin` from `../middlewares/authz` and apply it explicitly (or via `router.use(...)` for fully-internal routers like treasury/risk/settlement/intranet/prospecting). There is no global default-deny middleware — a new route file that forgets this is open by default.
- Orval-generated hooks: list/collection endpoints are named `getList<Entity>QueryKey`, while singular/aggregate endpoints (dashboard, health, auth) are named `getGet<Entity>QueryKey`. Mixing these up is a common and silent bug source.
- `format: email` / `format: uri` in the OpenAPI spec breaks Orval codegen against this workspace's pinned `zod@^3.25.76` — use plain `type: string` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
