/**
 * Verifies that the test database schema is in sync after `drizzle-kit push --force`.
 *
 * Connects to heliumdb_test and checks that every table defined in the Drizzle
 * schema actually exists.  Table names are derived at runtime from the schema
 * exports so new tables are automatically covered without updating a static list.
 *
 * If any table is missing the script exits non-zero with a clear message so the
 * test runner is blocked rather than silently running against an outdated schema.
 *
 * Run via:  pnpm --filter @workspace/db run verify-test-schema
 */
import { getTableName, Table } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema/index.js";
import { testDatabaseUrl } from "./test-db-url.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const testUrl = testDatabaseUrl(process.env.DATABASE_URL);

if (testUrl === process.env.DATABASE_URL) {
  console.error(
    "verify-test-schema: derived test DB URL is identical to DATABASE_URL — " +
      "refusing to verify against the dev database."
  );
  process.exit(1);
}

/** Derive expected table names from the Drizzle schema at runtime. */
const expectedTables: string[] = Object.values(schema)
  .filter((v): v is Table => v instanceof Table)
  .map((t) => getTableName(t))
  .sort();

if (expectedTables.length === 0) {
  console.error(
    "verify-test-schema: no Drizzle Table instances found in the schema exports. " +
      "Check that lib/db/src/schema/index.ts exports all table definitions."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: testUrl });

try {
  const result = await pool.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  const present = new Set(result.rows.map((r) => r.tablename));
  const missing = expectedTables.filter((t) => !present.has(t));

  if (missing.length > 0) {
    console.error(
      `\nverify-test-schema: FAILED — the following ${missing.length} table(s) are ` +
        `missing from heliumdb_test after drizzle-kit push:\n` +
        missing.map((t) => `  • ${t}`).join("\n") +
        `\n\nThis usually means the migration did not apply cleanly.  ` +
        `Fix the schema error and re-run the pretest step.\n`
    );
    process.exit(1);
  }

  console.log(
    `verify-test-schema: OK — all ${expectedTables.length} expected tables are present in heliumdb_test.`
  );
} finally {
  await pool.end();
}
