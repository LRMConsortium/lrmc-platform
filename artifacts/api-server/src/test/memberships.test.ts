import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
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
