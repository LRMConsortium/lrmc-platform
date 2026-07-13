import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, membershipsTable, usersTable, authTokensTable } from "@workspace/db";
import type Stripe from "stripe";
import { createMemberUser, createMemberUserWithMembership, createAdminUser } from "./helpers";
import { fulfillMembershipCheckout } from "../lib/membershipFulfillment";

async function createMembership(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/memberships").send({ type: "premium" });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("memberships status validation", () => {
  it("rejects an invalid status value with 400", async () => {
    const admin = await createAdminUser("admin");
    // Use a user with no pre-existing membership so POST /api/memberships succeeds.
    const member = await createMemberUserWithMembership("member", { withMembership: false });
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid status value (active)", async () => {
    const admin = await createAdminUser("admin");
    const member = await createMemberUserWithMembership("member", { withMembership: false });
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("accepts a valid status value (rejected)", async () => {
    const admin = await createAdminUser("admin");
    const member = await createMemberUserWithMembership("member", { withMembership: false });
    const membershipId = await createMembership(member.agent);

    const res = await admin.agent
      .patch(`/api/memberships/${membershipId}`)
      .send({ status: "rejected" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
  });
});

function fakeCheckoutSession(overrides: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return {
    id: "cs_test_placeholder",
    object: "checkout.session",
    amount_total: 5000,
    metadata: {},
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("membership checkout fulfillment", () => {
  it("ignores a completed webhook for a stale/abandoned checkout session", async () => {
    // Use a user with no pre-existing membership so POST /api/memberships succeeds.
    const member = await createMemberUserWithMembership("member", { withMembership: false });
    const membershipId = await createMembership(member.agent);

    // Simulate two checkout attempts: an older, abandoned session followed
    // by a newer one that the membership row currently points at.
    const staleSessionId = "cs_test_stale_abandoned";
    const currentSessionId = "cs_test_current";

    await db
      .update(membershipsTable)
      .set({ stripeCheckoutSessionId: currentSessionId })
      .where(eq(membershipsTable.id, membershipId));

    // The stale session (from the first, abandoned attempt) completes late.
    await fulfillMembershipCheckout(
      fakeCheckoutSession({
        id: staleSessionId,
        metadata: { membershipId: String(membershipId) },
      }),
    );

    const [afterStale] = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.id, membershipId));
    expect(afterStale.paymentStatus).toBe("unpaid");
    expect(afterStale.stripeCheckoutSessionId).toBe(currentSessionId);

    // The current session completing should be the only one allowed to mark
    // the membership as paid.
    await fulfillMembershipCheckout(
      fakeCheckoutSession({
        id: currentSessionId,
        metadata: { membershipId: String(membershipId) },
      }),
    );

    const [afterCurrent] = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.id, membershipId));
    expect(afterCurrent.paymentStatus).toBe("paid");
    expect(afterCurrent.stripeCheckoutSessionId).toBe(currentSessionId);
  });
});

// ---------------------------------------------------------------------------
// Deleted-user session guard — memberships routes
//
// isSessionStillValid() queries the DB for the user row on every request.
// If the row no longer exists the query returns nothing, the function returns
// false, and requireAdmin must respond with 401 — not 500 or a stale 200.
// ---------------------------------------------------------------------------

describe("memberships routes — deleted-user session guard", () => {
  it(
    "returns 401 on PATCH /memberships/:id when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("memberships-deleted-patch");
      const member = await createMemberUserWithMembership("memberships-deleted-member", {
        withMembership: false,
      });
      const membershipId = await createMembership(member.agent);

      // Confirm access while the admin row still exists.
      const before = await admin.agent
        .patch(`/api/memberships/${membershipId}`)
        .send({ status: "active" });
      expect(before.status, "admin should be able to update membership before deletion").toBe(200);

      // Hard-delete the admin's user row. Auth tokens must be removed first to
      // satisfy the FK constraint; the session cookie itself is unaffected.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Same session cookie — isSessionStillValid must return false → 401.
      const after = await admin.agent
        .patch(`/api/memberships/${membershipId}`)
        .send({ status: "rejected" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on PATCH /memberships/:id",
      ).toBe(401);
    },
  );
});
