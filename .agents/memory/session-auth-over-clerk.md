---
name: Local session auth chosen over Clerk
description: Why an Express app used bcrypt + express-session instead of the default Clerk/Replit-auth guidance.
---

When a `SESSION_SECRET` secret is already pre-provisioned in the environment (visible in available secrets) and the user's request implies a simple institutional/demo app with simulated data, it's reasonable to build local session-based auth (bcrypt password hashes + `express-session`, `role` field on the user) instead of defaulting to the Clerk/Replit-auth skills.

**Why:** the platform's default guidance steers new auth work toward Clerk or Replit Auth, but a pre-provisioned `SESSION_SECRET` is a strong signal the project's auth model was already decided as local/session-based before this session — building a second auth system on top would be redundant and wouldn't use the secret that was set up for it.

**How to apply:** before reaching for Clerk/Replit-auth by default, check whether `SESSION_SECRET` (or similar session secret) is already provisioned and whether the app's scope is simulated/internal (no real third-party identity requirements). If so, local session auth is a valid, deliberate deviation — implement with `express-session`, cookie `httpOnly`/`sameSite: "lax"`/`secure` gated on `NODE_ENV==="production"`, `proxy: true` (needed behind the Replit preview proxy), and set `credentials: "include"` as the default in the generated API client's fetch wrapper so cookies flow through the proxied preview.
