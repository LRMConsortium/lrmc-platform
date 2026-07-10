---
name: Membership payment/KYC gate is a soft UI gate
description: How the paid-but-pending-KYC member gate was interpreted and implemented, and the known limitation.
---

When a task asks for "payment gate + KYC review gate" with unpaid members redirected but paid-but-unreviewed members seeing a "grayed-out member's area", implement it as:
- Unpaid non-admins: hard redirect to the payment/membership hub page.
- Paid but KYC not yet approved: render the normal page tree but wrap it in a disabled/dimmed overlay (`pointer-events-none`, reduced opacity) plus a status banner, in a shared layout component (not scattered per-page). The hub page itself stays interactive so the member can pay/submit KYC.

**Why:** This was the literal reading of "grayed-out member's area" in the request, and matches the intended UX (visible-but-disabled) rather than a hard lockout.

**Resolved:** a hard server-side block was added. `requireApprovedMembership` middleware (in `middlewares/auth.ts`, alongside `requireAuth`/`requireAdmin`) checks the caller's own membership row (`paymentStatus === "paid" && kycStatus === "approved"`), admins exempt, 403 otherwise. It runs after `requireAuth` on every member-area route (properties, land, construction, mobility, marketplace, youth employment, internal messages/tickets, member dashboard) but is deliberately NOT applied to `/memberships` routes (checkout, KYC submission) since pending members must still be able to pay and submit KYC through those.
