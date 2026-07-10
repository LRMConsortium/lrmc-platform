---
name: Rate limiter test-suite exemption pattern
description: How to add a rate limiter to an auth route without breaking the authz test suite.
---

The api-server authz test suite (see authz-test-schema-gotchas.md) registers a fresh user per test
case via the real `/auth/register` endpoint, often hundreds of times per run, all from the same
in-process IP. Adding an IP-keyed rate limiter to `/auth/register` (or similar high-volume routes)
without an exemption will make most of the suite fail with 429s partway through — the failures show
up in unrelated test files as "Failed to register test user: 429", which reads confusingly like a
cascading unrelated failure.

**Why:** a real attacker never sets `NODE_ENV=test`, so exempting the test env doesn't weaken the
production protection.

**How to apply:** any new rate limiter on a route the test helpers call to bootstrap users needs
`skip: () => process.env.NODE_ENV === "test"` (vitest sets this automatically). Don't raise the limit
instead — hundreds of calls per run will still blow past any reasonable production limit.
