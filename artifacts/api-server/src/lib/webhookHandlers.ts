import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { fulfillDigitalProductCheckout } from "./digitalProductFulfillment";
import { logger } from "./logger";

/**
 * stripe-replit-sync stores the managed webhook's signing secret in its own
 * `stripe._managed_webhooks` table (not in the Replit connection settings),
 * since a managed webhook is created per-account after the connection
 * already exists. We read it from there to independently verify events for
 * our own fulfillment logic, on top of the generic sync.
 */
async function getManagedWebhookSecret(): Promise<string | undefined> {
  const result = await db.execute(
    sql`SELECT secret FROM "stripe"."_managed_webhooks" LIMIT 1`,
  );
  return (result.rows[0] as { secret?: string } | undefined)?.secret;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    // Validate payload is a Buffer
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " +
          typeof payload +
          ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    // Let stripe-replit-sync keep the `stripe` schema (products/prices/etc) in
    // sync -- this is the mandatory, generic half of webhook processing.
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Our own order fulfillment is business logic that stripe-replit-sync has
    // no knowledge of, so we additionally parse the event ourselves (using
    // the same signature) to react to checkout completion.
    const stripe = await getUncachableStripeClient();
    let event;
    try {
      // constructEventAsync avoids relying on Node's crypto webcrypto shim.
      event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        (await getManagedWebhookSecret()) ?? "",
      );
    } catch (err) {
      // Signature was already verified once by sync.processWebhook above, so
      // a failure here just means we can't safely react to it ourselves --
      // log and move on rather than throwing (the sync already succeeded).
      logger.warn({ err }, "Could not independently verify Stripe webhook for fulfillment");
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await fulfillDigitalProductCheckout(session);
    }
  }
}
