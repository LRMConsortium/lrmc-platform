import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { startAuthTokenCleanupJob } from "./jobs/authTokenCleanup";
import { getStripeSync } from "./lib/stripeClient";
import { getWebBaseUrl } from "./lib/urls";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required for Stripe integration.");
  }

  await runMigrations({ databaseUrl, logger });

  const stripeSync = await getStripeSync();
  await stripeSync.findOrCreateManagedWebhook(`${getWebBaseUrl()}/api/stripe/webhook`);

  // Don't block server startup on a full backfill; log failures instead of
  // crashing the process over a transient Stripe API hiccup.
  stripeSync.syncBackfill().catch((err) => {
    logger.error({ err }, "Stripe syncBackfill failed");
  });
}

try {
  await initStripe();
} catch (err) {
  logger.error({ err }, "Failed to initialize Stripe integration; continuing without it");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  startAuthTokenCleanupJob();
});
