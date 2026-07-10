import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

/**
 * stripe-replit-sync provisions its own managed webhook (via
 * `findOrCreateManagedWebhook`) and stores that signing secret in
 * `stripe._managed_webhooks`, separately from the Replit connection's
 * `settings.webhook_secret`. The managed secret is the one actually used to
 * sign events sent to our endpoint, so prefer it when present.
 */
async function getManagedWebhookSecret(): Promise<string | undefined> {
  try {
    const result = await db.execute(
      sql`SELECT secret FROM "stripe"."_managed_webhooks" LIMIT 1`,
    );
    return (result.rows[0] as { secret?: string } | undefined)?.secret;
  } catch {
    // Table may not exist yet on first-ever boot, before migrations/
    // provisioning have run.
    return undefined;
  }
}

/**
 * Fetches Stripe credentials from the Replit connection API.
 * Not cached -- tokens can rotate, so fetch fresh each time.
 */
async function getStripeCredentials(): Promise<{
  secretKey: string;
  webhookSecret?: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. " +
        "Ensure the Stripe integration is connected via the Integrations tab.",
    );
  }

  // Every Stripe-touching request re-fetches credentials, which under
  // concurrent load can trip the connector API's own rate limit. Retry a
  // handful of times on 429 with a short backoff instead of failing the
  // whole request outright.
  let resp: Response | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
      {
        headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (resp.status !== 429) break;
    await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
  }

  if (!resp || !resp.ok) {
    throw new Error(
      `Failed to fetch Stripe credentials: ${resp?.status} ${resp?.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { secret?: string; webhook_secret?: string } }>;
  };
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) {
    throw new Error(
      "Stripe integration not connected or missing secret key. " +
        "Connect Stripe via the Integrations tab first.",
    );
  }

  return {
    secretKey: settings.secret,
    webhookSecret: settings.webhook_secret,
  };
}

/**
 * Returns a fresh authenticated Stripe client.
 * Not cached -- fetches credentials on every call so rotated keys are picked up.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/**
 * Returns a fresh StripeSync instance for webhook processing and data sync.
 * Not cached -- fetches credentials on every call so rotated keys are picked up.
 */
export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const { secretKey, webhookSecret: connectionWebhookSecret } = await getStripeCredentials();
  // Prefer the managed webhook's own secret (the one Stripe actually signs
  // events with); fall back to the connection-level secret. Both may be
  // legitimately absent on first boot, before `findOrCreateManagedWebhook`
  // has run -- that call itself needs a StripeSync instance, so we can't
  // require a secret here. Once a managed webhook exists, `processWebhook`
  // (see webhookHandlers.ts) independently refuses to run without a real
  // secret, so an empty value here is never trusted for verification.
  const webhookSecret = (await getManagedWebhookSecret()) ?? connectionWebhookSecret ?? "";
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret,
  });
}
