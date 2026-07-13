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
import { runSetupTestSchema } from "./setup-test-schema-core";

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
  await runSetupTestSchema(adminPool);
} finally {
  await adminPool.end();
}
