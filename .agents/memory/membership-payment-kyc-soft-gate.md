---
name: Membership payment/KYC gate is a soft UI gate
description: How the paid-but-pending-KYC member gate was interpreted and implemented, and the known limitation.
---

When a task asks for "payment gate + KYC review gate" with unpaid members redirected but paid-but-unreviewed members seeing a "grayed-out member's area", implement it as:
- Unpaid non-admins: hard redirect to the payment/membership hub page.
- Paid but KYC not yet approved: render the normal page tree but wrap it in a disabled/dimmed overlay (`pointer-events-none`, reduced opacity) plus a status banner, in a shared layout component (not scattered per-page). The hub page itself stays interactive so the member can pay/submit KYC.

**Why:** This was the literal reading of "grayed-out member's area" in the request, and matches the intended UX (visible-but-disabled) rather than a hard lockout.

**Limitation to keep in mind:** dimming is UI-only — child pages still mount and their data queries still fire and succeed. A pending member could see their own member-area data via network inspection before KYC approval. This is acceptable when it's only the member's own data (not a cross-user leak), but if a task explicitly wants a hard block, the underlying member-area API endpoints need their own server-side `kycStatus === "approved"` checks, not just the layout-level dimming.
