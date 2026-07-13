/**
 * Core verification logic for the test database schema.
 *
 * Extracted from verify-test-schema.ts so it can be called from both the CLI
 * entry-point and from tests (which can inject a mock or real Pool).
 *
 * Throws a descriptive Error (rather than calling process.exit) so tests can
 * catch and inspect the message without spawning a subprocess.
 */
import type pg from "pg";

type Pool = InstanceType<typeof pg.Pool>;

export interface VerifyOptions {
  /** Physical table names expected to exist in the public schema. */
  expectedTables: string[];
  /** [table, column] pairs that must exist after the push. */
  expectedColumns: Array<[table: string, column: string]>;
}

/**
 * Verifies that the test database contains every expected table and column.
 *
 * @throws {Error} with a human-readable message listing every missing table or
 *   column when verification fails.  The message deliberately names each gap so
 *   a developer can immediately see what a partial push left behind.
 */
export async function runVerifyTestSchema(
  pool: Pool,
  { expectedTables, expectedColumns }: VerifyOptions
): Promise<void> {
  // ── 1. TABLE CHECK ──────────────────────────────────────────────────────────
  const tableResult = await pool.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  const presentTables = new Set(tableResult.rows.map((r) => r.tablename));
  const missingTables = expectedTables.filter((t) => !presentTables.has(t));

  if (missingTables.length > 0) {
    throw new Error(
      `verify-test-schema: FAILED — the following ${missingTables.length} table(s) are ` +
        `missing from heliumdb_test after drizzle-kit push:\n` +
        missingTables.map((t) => `  • ${t}`).join("\n") +
        `\n\nThis usually means the migration did not apply cleanly.  ` +
        `Fix the schema error and re-run the pretest step.`
    );
  }

  // ── 2. COLUMN CHECK ─────────────────────────────────────────────────────────
  const colResult = await pool.query<{
    table_name: string;
    column_name: string;
  }>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);

  const presentColumns = new Set(
    colResult.rows.map((r) => `${r.table_name}.${r.column_name}`)
  );

  const missingColumns = expectedColumns.filter(
    ([table, col]) => !presentColumns.has(`${table}.${col}`)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `verify-test-schema: FAILED — the following ${missingColumns.length} column(s) are ` +
        `missing from heliumdb_test after drizzle-kit push:\n` +
        missingColumns.map(([t, c]) => `  • ${t}.${c}`).join("\n") +
        `\n\nThis usually means a migration applied only partially.  ` +
        `Check the drizzle-kit push output for errors and re-run the pretest step.`
    );
  }
}
