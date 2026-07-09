---
name: Server-side authorization for multi-persona apps
description: Lesson from building a multi-role (admin/member) app — client-side role gating alone is not a security boundary.
---

When a frontend hides admin-only UI based on `user.role`, that is UX polish only. Every backend route must independently enforce the same rule (and derive identity like `ownerId`/`userId` from the authenticated session, never trust a client-supplied `userId` field in the request body or query string) or the API is fully open to anyone who can read the client bundle and call the endpoints directly.

**Why:** A generated backend (many CRUD route files added quickly, one per domain) had zero server-side auth checks on write endpoints and several aggregate/read endpoints (treasury, admin dashboard, member dashboard by arbitrary `userId`), even though the frontend correctly hid those UI paths for non-admins. A code-review pass caught this before ship; it would have been a full data-exposure and tampering vulnerability in production.

**How to apply:** When scaffolding many similar CRUD route files for a role-gated app, build a small `requireAuth`/`requireAdmin` middleware pair up front and apply it to every route as it's written (or via `router.use(...)` for routers that are entirely internal/admin, like treasury/risk/settlement/CRM/intranet). For member-owned resources, always set foreign keys like `ownerId`/`userId`/`sellerId` from `req.user.id` server-side on create, and check ownership (or admin role) before allowing update/delete on an existing row.
