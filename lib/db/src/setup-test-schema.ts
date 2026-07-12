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

// Connect to the default DB to drop/create the test DB.
const adminPool = new Pool({ connectionString: baseUrl });

try {
  // Terminate existing connections to heliumdb_test so DROP DATABASE succeeds.
  await adminPool.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'heliumdb_test' AND pid <> pg_backend_pid()
  `);
  await adminPool.query("DROP DATABASE IF EXISTS heliumdb_test");
  await adminPool.query("CREATE DATABASE heliumdb_test");
  console.log("Test database recreated successfully.");
} finally {
  await adminPool.end();
}
