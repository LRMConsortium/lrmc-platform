---
name: stripe-replit-sync bundling breaks migrations
description: esbuild-bundled api-server fails with "relation stripe.accounts does not exist" because the migrations directory can't be found at runtime.
---

`stripe-replit-sync`'s `runMigrations()` resolves its bundled `.sql` migration
files with `path.resolve(__dirname, "./migrations")` relative to its own
package location. When esbuild bundles the package into the app's own
`dist/index.mjs`, `__dirname` resolves to the app's dist folder instead of the
package's install location, so migrations silently no-op ("migrations
directory ... not found, skipping" — only visible if you pass a `logger` to
`runMigrations`) and every `stripe.*` table lookup later fails.

**Why:** generic bundler footgun for any package that resolves sibling
non-JS assets (SQL, templates, etc.) via `__dirname` at runtime — bundling
moves the code but not those sibling files.

**How to apply:** add `stripe-replit-sync` to the esbuild `external` array in
`build.mjs` so it's `require`d from `node_modules` at runtime instead of
inlined. Also pass `{ databaseUrl, logger }` to `runMigrations` during setup
so a silent skip shows up in logs instead of surfacing later as a confusing
"relation does not exist" error from an unrelated call site.
