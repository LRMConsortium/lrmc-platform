/**
 * Ensures the `heliumdb_test` database exists and is clean.  Drops and
 * recreates it so every test run starts with a completely empty database —
 * fully isolated from the shared dev database.
 *
 * Run via:  pnpm --filter @workspace/db run setup-test-schema
 *
 * Must connect to the *default* database (heliumdb) to issue CREATE/DROP
 * DATABASE, then reconnect to heliumdb_test so the connection is closed before
 * the drop.
 */
import pg from "pg";
import { testDatabaseUrl } from "./test-db-url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export { testDatabaseUrl };

const baseUrl = process.env.DATABASE_URL;
const derivedTestUrl = testDatabaseUrl(baseUrl);

// Safety guard: the test DB URL must differ from the dev DB URL.
// If they are the same, testDatabaseUrl() failed to find a replaceable database
// name in the connection string (e.g. the URL format is unexpected), which means
// push-force-test would target the dev database — an unrecoverable data loss.
if (derivedTestUrl === baseUrl) {
  throw new Error(
    `setup-test-schema: the derived test database URL is identical to the dev ` +
      `DATABASE_URL ("${baseUrl}"). ` +
      `This means the test schema would be pushed to the dev database. Aborting. ` +
      `Ensure DATABASE_URL ends with a recognisable database name, e.g. .../heliumdb.`
  );
}

// Connect to the default DB to drop/create the test DB.
const adminPool = new Pool({ connectionString: baseUrl });

try {
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
    const terminateResult = await adminPool.query<{ pg_terminate_backend: boolean }>(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'heliumdb_test' AND pid <> pg_backend_pid()
    `);
    const terminated = terminateResult.rows.length;
    if (terminated > 0) {
      console.log(`Terminated ${terminated} existing connection(s) to heliumdb_test.`);
    }

    // Give backends a moment to fully close before the DROP.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Drop must succeed — if it fails, we must not silently run tests against
  // a stale database.
  await adminPool.query("DROP DATABASE IF EXISTS heliumdb_test");

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
} finally {
  await adminPool.end();
}
