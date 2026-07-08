---
name: OpenAPI email format breaks orval/zod codegen with pinned zod v3
description: Why `format: email` in an OpenAPI spec must be avoided when the workspace pins zod v3 but codegen emits v4 syntax.
---

In this workspace's OpenAPI → orval → zod codegen pipeline, declaring `format: email` on a string schema causes the generated Zod code to emit `z.email(...)` (zod v4 method syntax). The workspace pins `zod@3.25.76`, which does not have a top-level `z.email()` — it breaks `tsc` in the generated `lib/api-zod` package.

**Why:** the codegen tool's OpenAPI-format-to-Zod mapping assumes zod v4 conventions regardless of the actual installed zod version, so there's a silent version mismatch between generator output and the pinned dependency.

**How to apply:** avoid `format: email` (and likely other `format:` keywords that map to newer zod top-level validators) in the OpenAPI spec. Use plain `type: string` with `minLength`/`pattern` constraints instead, and validate email shape at the application layer if needed. Re-check this if the workspace ever upgrades to zod v4.
