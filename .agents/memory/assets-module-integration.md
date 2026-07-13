---
name: Assets module integration
description: How the Assets module was added from the Asset Manager repo, and gotchas hit during integration.
---

## What was added
Full CRUD asset management (property/vehicle/airbnb/resort) pulled from the Asset Manager parallel repo.
- `lib/db/src/schema/assets.ts` — `assetsTable` with integer FK to `usersTable.id`
- OpenAPI spec: `/assets` and `/assets/{id}` endpoints + `Asset`/`AssetInput`/`AssetUpdate` schemas
- `artifacts/api-server/src/routes/assets.ts` — session auth (not Replit Auth)
- `artifacts/web/src/pages/assets.tsx` — card grid, create dialog, admin approve/reject
- Nav item added to `AppLayout.tsx`

## Gotchas

### Drizzle push blocked on interactive prompt
`drizzle-kit push` (and `push-force`) both hang on an interactive prompt about adding `memberships_user_id_unique`. Cannot be bypassed non-interactively. **Workaround: create new tables via direct SQL** using `node -e "..."` with the pg client at `/home/runner/workspace/node_modules/.pnpm/pg@8.22.0/node_modules/pg`.

**Why:** The memberships table has existing rows and drizzle wants confirmation before adding a unique constraint that could fail if duplicates exist.

**How to apply:** Any new table additions should use direct SQL `CREATE TABLE IF NOT EXISTS ...` rather than drizzle push until the memberships constraint issue is resolved.

### GetInternalMessageParams / GetInternalMessageResponse dropped by codegen
`artifacts/api-server/src/routes/internal.ts` imported two schemas (`GetInternalMessageParams`, `GetInternalMessageResponse`) that were never in the OpenAPI spec — they were hand-named in the route. When codegen regenerated (with `clean: true`), these were not emitted. Fixed by reusing `MarkInternalMessageReadParams` (same `{id: integer}` shape) and `ListInternalMessagesResponseItem` (same message shape).

**Why:** Orval clean mode deletes everything in the output dir and only emits what's in the spec. Any route using hand-named schemas that don't exist in the spec will break on next codegen.

**How to apply:** When adding new routes, either add the endpoint to the OpenAPI spec (preferred) or define validation schemas inline in the route file using `z.object(...)` directly — never invent schema names that don't exist in the spec.
