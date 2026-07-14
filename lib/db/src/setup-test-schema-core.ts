/**
 * Core logic for setting up the heliumdb_test database.
 *
 * Extracted from setup-test-schema.ts so it can be called from both the CLI
 * entry-point and from tests (which can inject a mock or real Pool).
 */
import type pg from "pg";

type Pool = InstanceType<typeof pg.Pool>;

/** PostgreSQL error code: "cannot drop a database that has active connections" */
const PG_OBJECT_IN_USE = "55006";

/** Poll interval and maximum wait when draining lingering connections (ms). */
const DRAIN_POLL_INTERVAL_MS = 100;
const DRAIN_MAX_WAIT_MS = 5_000;

/** Maximum DROP retry attempts after 55006 (with exponential backoff). */
const DROP_MAX_RETRIES = 5;

/**
 * Arbitrary advisory lock key used to serialise concurrent setup-test-schema
 * runs.  Two processes trying to drop-and-recreate heliumdb_test at the same
 * time would corrupt each other's test run; the lock makes them queue instead.
 *
 * pg_advisory_lock is session-scoped: it's automatically released when the
 * connection is closed, so it's safe even if the process crashes mid-run.
 */
export const ADVISORY_LOCK_KEY = 7_463_218_412; // arbitrary stable int64

/**
 * Waits until no connections to heliumdb_test remain (other than our own
 * admin connection), polling every DRAIN_POLL_INTERVAL_MS ms.
 *
 * Returns the number of milliseconds actually waited.
 * Throws if DRAIN_MAX_WAIT_MS is exceeded.
 */
async function waitUntilDrained(adminPool: Pool): Promise<number> {
  const start = Date.now();
  while (true) {
    const result = await adminPool.query<{ count: string }>(`
      SELECT count(*) AS count
      FROM pg_stat_activity
      WHERE datname = 'heliumdb_test'
        AND pid <> pg_backend_pid()
    `);
    const remaining = parseInt(result.rows[0]?.count ?? "0", 10);
    if (remaining === 0) {
      return Date.now() - start;
    }
    const elapsed = Date.now() - start;
    if (elapsed >= DRAIN_MAX_WAIT_MS) {
      throw new Error(
        `Timed out waiting for heliumdb_test connections to drain after ` +
          `${DRAIN_MAX_WAIT_MS} ms. ${remaining} connection(s) still active. ` +
          `Aborting to avoid a failed DROP DATABASE.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, DRAIN_POLL_INTERVAL_MS));
  }
}

async function dropAndRecreate(adminPool: Pool): Promise<void> {
  // Check if heliumdb_test already exists.
  const existsResult = await adminPool.query<{ exists: boolean }>(`
    SELECT EXISTS(
      SELECT 1 FROM pg_database WHERE datname = 'heliumdb_test'
    ) AS exists
  `);
  const dbExists = existsResult.rows[0]?.exists ?? false;

  if (dbExists) {
    // Block new connections so nothing sneaks in while we're terminating.
    await adminPool.query(
      "ALTER DATABASE heliumdb_test CONNECTION LIMIT 0"
    );

    // Terminate all existing connections to heliumdb_test.
    const terminateResult = await adminPool.query<{
      pg_terminate_backend: boolean;
    }>(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'heliumdb_test' AND pid <> pg_backend_pid()
    `);
    const terminated = terminateResult.rows.length;
    if (terminated > 0) {
      console.log(
        `Terminated ${terminated} existing connection(s) to heliumdb_test.`
      );
    }

    // Poll until all backends have fully closed — a fixed sleep is
    // unreliable under CI load; we need confirmation before DROP.
    const waited = await waitUntilDrained(adminPool);
    if (waited > 0) {
      console.log(
        `All connections drained after ${waited} ms.`
      );
    }
  }

  // Attempt DROP with bounded exponential backoff on 55006
  // ("cannot drop a database that has active connections").
  // This handles rare races where a new connection sneaks past the LIMIT 0
  // gate before the OS fully closes the terminated socket.
  let lastError: unknown;
  for (let attempt = 1; attempt <= DROP_MAX_RETRIES; attempt++) {
    try {
      await adminPool.query("DROP DATABASE IF EXISTS heliumdb_test");
      lastError = undefined;
      break;
    } catch (err: unknown) {
      const pgCode = (err as { code?: string }).code;
      if (pgCode !== PG_OBJECT_IN_USE) {
        // Unexpected error — propagate immediately.
        throw err;
      }
      lastError = err;
      const backoffMs = DRAIN_POLL_INTERVAL_MS * 2 ** attempt;
      console.warn(
        `DROP DATABASE attempt ${attempt}/${DROP_MAX_RETRIES} blocked ` +
          `(55006 — active connections). Retrying in ${backoffMs} ms…`
      );
      // Re-terminate any connections that survived.
      await adminPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'heliumdb_test' AND pid <> pg_backend_pid()
      `);
      await waitUntilDrained(adminPool);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  if (lastError) {
    throw new Error(
      `DROP DATABASE heliumdb_test failed after ${DROP_MAX_RETRIES} attempts ` +
        `due to persistent active connections. ` +
        `Original error: ${String(lastError)}`
    );
  }

  // Verify the database is truly gone before recreating it.
  const verifyResult = await adminPool.query<{ exists: boolean }>(`
    SELECT EXISTS(
      SELECT 1 FROM pg_database WHERE datname = 'heliumdb_test'
    ) AS exists
  `);
  if (verifyResult.rows[0]?.exists) {
    throw new Error(
      "DROP DATABASE heliumdb_test appeared to succeed but the database still exists. " +
        "A connection may still be holding it open. Aborting to avoid running tests " +
        "against stale data."
    );
  }

  await adminPool.query("CREATE DATABASE heliumdb_test");
  console.log("Test database recreated successfully.");
}

export async function runSetupTestSchema(adminPool: Pool): Promise<void> {
  // Acquire an exclusive session-level advisory lock so that concurrent
  // validation runs queue rather than racing to drop/recreate heliumdb_test.
  // pg_advisory_lock blocks until the lock is available, so callers serialise
  // automatically.  The lock is released when the client is returned to the
  // pool (session ends), ensuring it's freed even on crash.
  const lockClient = await adminPool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    try {
      await dropAndRecreate(adminPool);
    } finally {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    lockClient.release();
  }
}
