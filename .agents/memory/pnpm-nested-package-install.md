---
name: pnpm workspace nested package installs
description: Root-level package installer can fail for a dependency scoped to one workspace member.
---

Adding a dependency (e.g. `tsx`, `bcryptjs`) to a specific package inside this pnpm monorepo (like `lib/db` or `artifacts/api-server`) sometimes fails from the workspace root with `ERR_PNPM_ADDING_TO_ROOT` when using the standard package-install tooling.

**Why:** the installer defaults to targeting the workspace root, which pnpm rejects for packages that should live under a specific workspace member's `package.json`.

**How to apply:** if a package install fails this way, `cd` into the specific package directory (e.g. `artifacts/api-server`, `lib/db`) and run the install from there instead of the workspace root.
