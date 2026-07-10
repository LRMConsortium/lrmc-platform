import { and, eq } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
import type Stripe from "stripe";
import { logger } from "./logger";

/**
 * Marks a membership's fee as paid once its Stripe Checkout session
 * completes. Idempotent: safe to call more than once for the same session
 * (Stripe retries webhooks, and the memberships page also does a
 * belt-and-suspenders confirmation check when the buyer lands back from
 * checkout).
 */
export async function fulfillMembershipCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const membershipId = Number(session.metadata?.membershipId);
  if (!membershipId || Number.isNaN(membershipId)) {
    return; // not a membership checkout session (e.g. a digital product one)
  }

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, membershipId));

  if (!membership) {
    logger.warn({ membershipId, sessionId: session.id }, "Received checkout.session.completed for an unknown membership");
    return;
  }

  if (membership.paymentStatus === "paid") return; // already fulfilled

  // Atomically claim the "unpaid -> paid" transition so concurrent/retried
  // webhook deliveries can't double-apply this.
  await db
    .update(membershipsTable)
    .set({
      paymentStatus: "paid",
      feePaidCents: session.amount_total ?? membership.feePaidCents,
      stripeCheckoutSessionId: session.id,
    })
    .where(
      and(
        eq(membershipsTable.id, membershipId),
        eq(membershipsTable.paymentStatus, "unpaid"),
      ),
    );
}
