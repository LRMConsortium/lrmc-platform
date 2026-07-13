# LRMC Platform — Copilot Instructions

## Three-Tool Operating Model

This platform is built and governed by three distinct roles:

| Role | Tool | Responsibility |
|------|------|----------------|
| **Vision** | Mustafa (Founder) | Mission, business model, domain structure, product strategy, institutional identity |
| **Architecture** | Microsoft Copilot | System design, monorepo governance, planning, PR review, strategic guidance |
| **Execution** | Replit Agent | Code, migrations, servers, deployments, integrations |

Copilot's role is **institutional architect and technical reviewer** — not a code runner.

---

## Institutional Identity

**LRMC (Land Registry & Membership Consortium)** operates a unified digital platform under the **Ususu** brand. The platform follows a strict hierarchy:

```
HQ → Portal → Product
```

All modules, APIs, and assets must reflect LRMC's real-world operational structure.

---

## Monorepo Structure (Target)

```
/apps
  /attachment-manager-web     ← Member-facing web portal (React + Vite)
  /attachment-manager-api     ← API server (Express 5 + Drizzle)
  /asset-manager-web          ← Asset management UI
  /asset-manager-api          ← Asset management API
/packages
  /db                         ← Drizzle schema + migrations (single source of truth)
  /api-client                 ← Orval-generated React hooks
  /api-zod                    ← Orval-generated Zod schemas (from OpenAPI spec)
```

### Governance Rules
- Shared packages (`/packages/*`) must stay clean — no app-specific logic
- API schemas must stay consistent — the OpenAPI spec (`lib/api-spec/openapi.yaml`) is the contract
- Database models must stay unified — all tables in `lib/db/src/schema/`
- Module boundaries must not bleed across apps
- Naming conventions must stay institutional (see below)
- Folder structure must stay scalable

---

## Module Map

### Active Modules
| Module | Status |
|--------|--------|
| Membership (LRMC) | Active |
| Marketplace | Active |
| Digital Products | Active |
| Youth Employment | Active |
| Prospect Leads | Active |
| Asset Manager | Active |
| Messaging (internal) | Active |
| Ticketing | Active |
| Ads / Advertising | Active |

### Planned Modules
| Module | Description |
|--------|-------------|
| Ususu Mobility | Route and transport management |
| Property Management | Rental and tenant workflows |
| Land Registry | Parcel registration and ownership |
| Construction Oversight | Project tracking |
| Traveler Facilitation | Booking and facilitation |

### Asset Types
- Properties, Vehicles, Airbnbs, Resorts
- Land parcels, Construction projects
- Ususu routes, Digital products
- Membership tiers, Revenue streams

---

## API Design Rules

- All routes must be protected by session-based auth (`req.session.userId`, `req.session.role`)
- Role hierarchy: `admin` > `member` > unauthenticated
- All request/response shapes must be defined in the OpenAPI spec first, then code-generated via Orval
- No inline Zod schemas in route files — use generated schemas from `@workspace/api-spec`
- Rate limiting must use `skip: () => NODE_ENV === "test"` on high-volume auth routes
- Webhook endpoints must fail closed on missing secrets — never default to empty string

---

## Database Rules

- PostgreSQL + Drizzle ORM
- All schema changes go through `lib/db/src/schema/`
- `drizzle-kit push` is the migration path for dev; use direct SQL for new tables if push is blocked
- All foreign keys on `users.id` must have `ON DELETE CASCADE` or `ON DELETE SET NULL`
- No fractional counts in dashboard stats — all aggregates must be integers

---

## Auth Rules

- Session-based auth only (bcrypt + express-session + `SESSION_SECRET`)
- No Clerk, no Replit OIDC
- Session destruction on logout/delete must invalidate immediately
- Demoted admins must lose elevated access without re-login

---

## Naming Conventions

| Entity | Convention |
|--------|-----------|
| DB tables | `snake_case` (e.g. `digital_products`, `youth_employment`) |
| DB columns | `snake_case` (e.g. `price_cents`, `owner_id`) |
| API paths | `kebab-case` (e.g. `/digital-products`, `/youth-employment`) |
| TypeScript types | `PascalCase` |
| Zod schemas | `PascalCase` + suffix (e.g. `CreateProductBody`, `ListProductsResponse`) |
| React hooks | `camelCase` with `use` prefix (e.g. `useGetDigitalProducts`) |

---

## PR Review Checklist (Copilot Focus Areas)

When reviewing pull requests, flag:

- [ ] Route not protected by session auth middleware
- [ ] Schema change not reflected in OpenAPI spec
- [ ] New table added without ON DELETE rule on user FK
- [ ] Zod schema defined inline instead of generated
- [ ] Status field accepting arbitrary strings (not enum-constrained)
- [ ] Pagination missing on list endpoints
- [ ] Dashboard stat returned as float instead of integer
- [ ] Webhook secret defaulting to empty string
- [ ] Rate limiter missing test-suite exemption
- [ ] Module boundary violated (app-level logic in shared package)
- [ ] Naming convention inconsistency
- [ ] API contract mismatch between spec and implementation
