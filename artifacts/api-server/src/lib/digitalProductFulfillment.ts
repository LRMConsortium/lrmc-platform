import { and, eq, isNull } from "drizzle-orm";
import { db, digitalProductPurchasesTable, digitalProductsTable } from "@workspace/db";
import type Stripe from "stripe";
import { sendEmail, digitalProductDeliveryEmailContent } from "./email";
import { logger } from "./logger";

/**
 * Marks a digital-product purchase as paid and emails the buyer their
 * deliverable. Idempotent: safe to call more than once for the same
 * checkout session (Stripe retries webhooks, and this can also run from a
 * belt-and-suspenders confirmation check on the success page).
 */
export async function fulfillDigitalProductCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const [purchase] = await db
    .select()
    .from(digitalProductPurchasesTable)
    .where(eq(digitalProductPurchasesTable.stripeCheckoutSessionId, session.id));

  if (!purchase) {
    logger.warn(
      { sessionId: session.id },
      "Received checkout.session.completed for an unknown purchase",
    );
    return;
  }

  // Atomically claim the "pending -> paid" transition so concurrent/retried
  // webhook deliveries can't both pass this check and double-send email.
  // The amount/currency actually charged (post-discount) comes from Stripe's
  // own session total, not our catalog price snapshot taken at checkout
  // time.
  if (purchase.status !== "paid") {
    const [updated] = await db
      .update(digitalProductPurchasesTable)
      .set({
        status: "paid",
        amountCents: session.amount_total ?? purchase.amountCents,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        fulfilledAt: new Date(),
      })
      .where(
        and(
          eq(digitalProductPurchasesTable.id, purchase.id),
          eq(digitalProductPurchasesTable.status, "pending"),
        ),
      )
      .returning();

    if (!updated) {
      // Another concurrent delivery already made the transition; fall
      // through so we still retry email delivery below if it hasn't
      // succeeded yet.
    }
  }

  // Delivery is tracked independently of payment status: if sending the
  // email fails (e.g. Resend outage), a later duplicate webhook delivery
  // will retry just this step instead of skipping it because the purchase
  // is already "paid". The claim itself is atomic (UPDATE ... WHERE
  // delivered_at IS NULL RETURNING) so two concurrent webhook deliveries
  // can't both pass a read-then-send check and double-send the email.
  const [claimed] = await db
    .update(digitalProductPurchasesTable)
    .set({ deliveredAt: new Date() })
    .where(
      and(
        eq(digitalProductPurchasesTable.id, purchase.id),
        isNull(digitalProductPurchasesTable.deliveredAt),
      ),
    )
    .returning();

  if (!claimed) {
    return; // another delivery already claimed (or previously completed) this
  }

  const [product] = await db
    .select()
    .from(digitalProductsTable)
    .where(eq(digitalProductsTable.id, purchase.productId));

  try {
    await sendEmail({
      to: purchase.buyerEmail,
      ...digitalProductDeliveryEmailContent(product?.title ?? "your purchase", product?.fileUrl ?? null),
    });
  } catch (err) {
    // Release the claim so a later webhook retry attempts delivery again
    // instead of silently treating this purchase as delivered.
    await db
      .update(digitalProductPurchasesTable)
      .set({ deliveredAt: null })
      .where(eq(digitalProductPurchasesTable.id, purchase.id));
    throw err;
  }
}
