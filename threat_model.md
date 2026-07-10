# Threat Model

## Project Overview

A pnpm-workspace monorepo running an Express 5 API (`artifacts/api-server`) backed by PostgreSQL/Drizzle, with a React web frontend (`artifacts/web`) and a dev-only mockup sandbox (`artifacts/mockup-sandbox`). The app appears to be a membership-gated community platform ("LRMC & Ususu") offering property listings, land listings, construction, mobility (ride/driver), marketplace ads and digital-product sales, youth employment, prospecting/leads, risk events, settlement obligations, and treasury/admin financial views. Not currently deployed.

## Assets

- **User credentials & sessions** — password hashes, session cookies, `sessionVersion` invalidation token (`users` table).
- **Membership/KYC status** — gates access to the full member area; used as an authorization signal (`memberships` table).
- **Financial/treasury data** — transactions, liquidity snapshots, currency rates, settlement obligations — staff-only.
- **Marketplace & digital product data** — ads (with admin-only rejection notes/chains), digital products, purchase records, Stripe checkout sessions.
- **PII** — buyer emails, addresses, driver/user profile data.
- **Stripe secrets/webhook signing secrets**.

## Trust Boundaries

- **Browser ↔ API** — session-cookie auth; all mutating/admin endpoints must enforce server-side checks (client cannot be trusted).
- **API ↔ PostgreSQL** — via Drizzle ORM (parameterized); direct DB access from API process.
- **API ↔ Stripe** — checkout sessions and webhook callbacks; webhook signature verification is required.
- **Public ↔ Authenticated (`requireAuth`) ↔ Approved Member (`requireApprovedMembership`) ↔ Admin (`requireAdmin`)** — layered authorization in `src/middlewares/auth.ts`. `isOwnerOrAdmin` (`middlewares/authz.ts`) is the standard ownership check for resource mutation.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/*.ts` (auth, memberships, marketplace, property-listings, land, construction, mobility, prospecting, risk, settlement, youth, dashboard, internal, treasury, health).
- Session/authz core: `artifacts/api-server/src/middlewares/{auth,authz,rateLimit,session}.ts`.
- Stripe/webhook/fulfillment logic: `artifacts/api-server/src/lib/{membershipStripe,membershipFulfillment,digitalProductFulfillment,digitalProductStripeSync,webhookHandlers,stripeClient,email,tokens}.ts`.
- `artifacts/mockup-sandbox` is dev-only design tooling — ignore unless proven reachable from a production route.
- Recent hardening commit (baseline HEAD) constrained several enums, capped ad ancestor-chain traversal, deduped digital-product purchases, stripped `rejectionNote`/`parentAdId` from public ad responses, and bounded/ordered marketplace listing queries — verified largely intact by this scan, with a few gaps noted in `.local/new_vulnerabilities/`.
- Known gap pattern: some domains still use unconstrained `zod.string()` for status/priority fields instead of `zod.enum([...])` (e.g. internal tickets), and some status-transition endpoints lack a state-machine guard beyond ownership (e.g. driver self-approval, land listing status).

## Threat Categories

### Elevation of Privilege
`isOwnerOrAdmin` correctly gates most mutations, but a few endpoints let a resource owner change privileged fields (e.g. approval `status`) that should require admin, not just ownership. Any endpoint accepting a `status`/`role`-like enum from a non-admin caller must explicitly exclude privileged transitions or require `requireAdmin`.

### Spoofing / Session Integrity
Session role/state is cached in the signed cookie at login and only invalidated via `sessionVersion` bump on password reset. Role changes (e.g. admin demotion) do not bump `sessionVersion`, so a demoted admin's existing session retains admin privileges until it naturally expires.

### Tampering
Digital-product `fileUrl` and guest `buyerEmail` are insufficiently validated (no URL scheme/allowlist, no email format), enabling injection into transactional emails and dedup-guard bypass.

### Denial of Service
Some admin-only listing endpoints (treasury, risk, settlement, prospecting, internal, youth) return unbounded result sets, unlike the marketplace/ads listings which already enforce page-size caps.

### Information Disclosure
Public marketplace/ad listing endpoints correctly strip `rejectionNote`, `parentAdId`, and `advertiserId` from public-facing responses — verified intact.
