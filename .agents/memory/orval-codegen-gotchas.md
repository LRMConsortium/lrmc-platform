---
name: Orval codegen gotchas
description: Two recurring silent-failure traps when generating a React Query client from an OpenAPI spec with Orval in a zod-catalog-pinned workspace.
---

- If the workspace's zod catalog is pinned to `zod@^3.x`, do not use `format: email` / `format: uri` in the OpenAPI spec — Orval emits `z.email()`/`z.url()` calls that only exist in zod v4, breaking the generated client's typecheck. Use plain `type: string` instead and validate format elsewhere if needed.
- Orval names query-key helpers differently depending on whether the endpoint is a list/collection vs. a singular/aggregate resource: list endpoints get `getList<Entity>QueryKey` (no extra "Get"), while singular or aggregate endpoints (dashboard summaries, health checks, current-user) get `getGet<Entity>QueryKey`. Frontend code (especially AI-generated pages) commonly mixes these up and fails silently at typecheck with confusing "not defined" or wrong-arity errors. Grep the generated `api.ts` for the real export name before wiring up a new hook.
