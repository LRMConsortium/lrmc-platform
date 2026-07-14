/**
 * Vitest global setup — runs once before all test files and tears down after.
 *
 * Acquires the same PostgreSQL advisory lock that setup-test-schema uses when
 * it drops and recreates heliumdb_test.  Holding the lock for the full duration
 * of the test run ensures a concurrent validation run's pretest cannot wipe
 * heliumdb_test mid-suite, which would cause every subsequent DB query to fail
 * with "relation <table> does not exist".
 *
 * The lock is session-scoped and is automatically released if this process
 * crashes — no manual cleanup is needed on the PG side.
 *
 * IMPORTANT: This key must stay in sync with ADVISORY_LOCK_KEY in
 * lib/db/src/setup-test-schema-core.ts.
 */
import pg from "pg";

const { Client } = pg;

/** Must match ADVISORY_LOCK_KEY in lib/db/src/setup-test-schema-core.ts */
const ADVISORY_LOCK_KEY = 7_463_218_412;

let lockClient: InstanceType<typeof Client> | null = null;

export async function setup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // DATABASE_URL is required; the pretest already validates this.
    return;
  }

  // Connect to the BASE database (not heliumdb_test) so this connection stays
  // alive even if another setup run drops and recreates heliumdb_test.
  // This mirrors what setup-test-schema.ts does.
  lockClient = new Client({ connectionString: databaseUrl });
  await lockClient.connect();

  // Block until the lock is available.  If another validation run is currently
  // in its test phase (globalSetup holding the lock), we wait here rather than
  // racing to drop the shared heliumdb_test database.
  await lockClient.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
}

export async function teardown(): Promise<void> {
  if (!lockClient) return;
  try {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
  } catch {
    // Ignore — the lock is released automatically when the connection closes.
  }
  try {
    await lockClient.end();
  } catch {
    // Best-effort cleanup.
  }
  lockClient = null;
}
