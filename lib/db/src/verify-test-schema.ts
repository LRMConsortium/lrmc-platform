/**
 * Verifies that the test database schema is in sync after `drizzle-kit push --force`.
 *
 * Connects to heliumdb_test and performs two checks:
 *
 * 1. TABLE CHECK — every table defined in the Drizzle schema actually exists.
 *    Table names are derived at runtime from the schema exports so new tables
 *    are automatically covered without updating a static list.
 *
 * 2. COLUMN CHECK — a representative set of frequently-changed columns is
 *    spot-checked via information_schema.columns for key tables.  A partial
 *    migration can leave a table present but missing new columns; this catches
 *    that case and names the missing table + column explicitly.
 *
 * Both checks exit non-zero with a clear message so the test runner is blocked
 * rather than silently running against an outdated or half-applied schema.
 *
 * Run via:  pnpm --filter @workspace/db run verify-test-schema
 */
import { getTableName, Table } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema/index.js";
import { testDatabaseUrl } from "./test-db-url.js";
import { runVerifyTestSchema } from "./verify-test-schema-core.js";

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

/**
 * Representative columns to spot-check for key tables.
 *
 * These are expressed as [table, column] pairs using the physical (snake_case)
 * column names that Drizzle writes to PostgreSQL.  Focus on columns that:
 *   - were added in recent migrations (easy to miss in a partial push), or
 *   - drive critical business logic (status gates, FK links, payment fields).
 *
 * When you add a migration that introduces new columns to a key table, add an
 * entry here so a partial push is caught before the test suite runs.
 */
const expectedColumns: Array<[table: string, column: string]> = [
  // users — auth & session fields
  ["users", "email"],
  ["users", "password_hash"],
  ["users", "full_name"],
  ["users", "phone"],
  ["users", "role"],
  ["users", "email_verified_at"],
  ["users", "session_version"],

  // memberships — payment + KYC gate columns
  ["memberships", "user_id"],
  ["memberships", "type"],
  ["memberships", "fee_paid_cents"],
  ["memberships", "status"],
  ["memberships", "payment_status"],
  ["memberships", "stripe_checkout_session_id"],
  ["memberships", "kyc_status"],
  ["memberships", "kyc_full_name"],
  ["memberships", "kyc_id_type"],
  ["memberships", "kyc_id_number"],
  ["memberships", "kyc_notes"],
  ["memberships", "kyc_submitted_at"],
  ["memberships", "kyc_reviewed_at"],

  // assets — new module from Asset Manager merge
  ["assets", "owner_id"],
  ["assets", "category"],
  ["assets", "type"],
  ["assets", "status"],
  ["assets", "metadata"],

  // ads — moderation workflow columns (rejection_note and parent_ad_id are easy to miss)
  ["ads", "advertiser_id"],
  ["ads", "title"],
  ["ads", "content"],
  ["ads", "placement"],
  ["ads", "status"],
  ["ads", "parent_ad_id"],
  ["ads", "rejection_note"],

  // digital_products — Stripe catalog link columns
  ["digital_products", "seller_id"],
  ["digital_products", "title"],
  ["digital_products", "price_cents"],
  ["digital_products", "status"],
  ["digital_products", "file_url"],
  ["digital_products", "stripe_product_id"],
  ["digital_products", "stripe_price_id"],

  // digital_product_purchases — order lifecycle + delivery columns
  ["digital_product_purchases", "product_id"],
  ["digital_product_purchases", "buyer_id"],
  ["digital_product_purchases", "buyer_email"],
  ["digital_product_purchases", "amount_cents"],
  ["digital_product_purchases", "member_discount_applied"],
  ["digital_product_purchases", "stripe_checkout_session_id"],
  ["digital_product_purchases", "stripe_payment_intent_id"],
  ["digital_product_purchases", "status"],
  ["digital_product_purchases", "fulfilled_at"],
  ["digital_product_purchases", "delivered_at"],
];

const pool = new Pool({ connectionString: testUrl });

try {
  await runVerifyTestSchema(pool, { expectedTables, expectedColumns });

  console.log(
    `verify-test-schema: tables OK — all ${expectedTables.length} expected tables are present in heliumdb_test.`
  );
  console.log(
    `verify-test-schema: columns OK — all ${expectedColumns.length} spot-checked columns are present in heliumdb_test.`
  );
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
} finally {
  await pool.end();
}
