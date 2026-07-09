import { lt, or, and, isNotNull } from "drizzle-orm";
import { db, authTokensTable } from "@workspace/db";
import { logger } from "../lib/logger";

// Auth tokens (email verification / password reset) that expired more than
// this long ago are permanently useless and safe to delete, whether or not
// they were ever used.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function pruneExpiredAuthTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  const deleted = await db
    .delete(authTokensTable)
    .where(
      or(
        lt(authTokensTable.expiresAt, cutoff),
        and(isNotNull(authTokensTable.usedAt), lt(authTokensTable.usedAt, cutoff)),
      ),
    )
    .returning({ id: authTokensTable.id });

  if (deleted.length > 0) {
    logger.info({ count: deleted.length }, "Pruned expired/used auth tokens");
  }

  return deleted.length;
}

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

export function startAuthTokenCleanupJob(): NodeJS.Timeout {
  pruneExpiredAuthTokens().catch((err) => {
    logger.error({ err }, "Initial auth token cleanup failed");
  });

  return setInterval(() => {
    pruneExpiredAuthTokens().catch((err) => {
      logger.error({ err }, "Scheduled auth token cleanup failed");
    });
  }, CLEANUP_INTERVAL_MS);
}
