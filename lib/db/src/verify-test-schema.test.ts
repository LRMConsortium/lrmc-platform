/**
 * Tests for runVerifyTestSchema — the core logic that catches a half-applied
 * drizzle-kit push before the test suite runs against a broken schema.
 *
 * All tests use a mocked pool so they run without a live database connection.
 * Three failure modes are exercised:
 *
 * 1. Missing table  — a table listed in the Drizzle schema is absent from
 *    pg_tables.  The function must throw with a message naming every gap.
 *
 * 2. Missing column — a table is present but a spot-checked column is absent
 *    from information_schema.columns.  The function must throw and name the
 *    exact [table, column] pair(s) missing.
 *
 * 3. Clean schema   — all expected tables and columns are present.  The
 *    function must resolve without throwing.
 *
 * These scenarios mirror what happens when drizzle-kit push --force fails
 * partway through: some tables or columns land, others don't.  runVerifyTestSchema
 * must surface the drift instead of letting the test suite proceed silently.
 */

import { describe, it, expect, vi, type MockedFunction } from "vitest";
import pg from "pg";
import { runVerifyTestSchema } from "./verify-test-schema-core";

const { Pool } = pg;

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a mock pool whose query() returns responses in order. */
function makeMockPool(
  queryResponses: Array<{ rows: unknown[] }>
): InstanceType<typeof Pool> {
  let callIndex = 0;
  const mockQuery = vi.fn(async () => {
    const response = queryResponses[callIndex];
    if (!response) {
      throw new Error(
        `Unexpected extra query call (#${callIndex}) in mock pool`
      );
    }
    callIndex += 1;
    return response;
  }) as MockedFunction<(sql: string) => Promise<{ rows: unknown[] }>>;

  return { query: mockQuery } as unknown as InstanceType<typeof Pool>;
}

// ─── test fixtures ───────────────────────────────────────────────────────────

const TABLES = ["users", "memberships", "ads"];
const COLUMNS: Array<[string, string]> = [
  ["users", "email"],
  ["users", "password_hash"],
  ["ads", "status"],
  ["ads", "rejection_note"],
];

/** pg_tables rows representing all expected tables present. */
function allTablesPresent() {
  return { rows: TABLES.map((tablename) => ({ tablename })) };
}

/** information_schema.columns rows representing all spot-checked columns present. */
function allColumnsPresent() {
  return {
    rows: COLUMNS.map(([table_name, column_name]) => ({
      table_name,
      column_name,
    })),
  };
}

// ─── 1. missing table ────────────────────────────────────────────────────────

describe("runVerifyTestSchema – missing table", () => {
  it("throws when one expected table is absent from pg_tables", async () => {
    // Return pg_tables without "ads" to simulate a partial push.
    const tableRows = TABLES.filter((t) => t !== "ads").map((tablename) => ({
      tablename,
    }));
    const pool = makeMockPool([{ rows: tableRows }]);

    await expect(
      runVerifyTestSchema(pool, { expectedTables: TABLES, expectedColumns: [] })
    ).rejects.toThrow(/1 table\(s\) are missing/);
  });

  it("names every missing table in the error message", async () => {
    // Return an empty pg_tables — nothing was pushed.
    const pool = makeMockPool([{ rows: [] }]);

    await expect(
      runVerifyTestSchema(pool, { expectedTables: TABLES, expectedColumns: [] })
    ).rejects.toThrow(
      /• users[\s\S]*• memberships[\s\S]*• ads|• memberships[\s\S]*• users/
    );
  });

  it("names the single missing table explicitly", async () => {
    const tableRows = TABLES.filter((t) => t !== "memberships").map(
      (tablename) => ({ tablename })
    );
    const pool = makeMockPool([{ rows: tableRows }]);

    const err = await runVerifyTestSchema(pool, {
      expectedTables: TABLES,
      expectedColumns: [],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("• memberships");
    expect((err as Error).message).not.toContain("• users");
    expect((err as Error).message).not.toContain("• ads");
  });

  it("does not proceed to the column check when a table is missing", async () => {
    // Only one response queued — if a second query runs the mock will throw.
    const pool = makeMockPool([{ rows: [] }]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: COLUMNS,
      })
    ).rejects.toThrow(/table\(s\) are missing/);
  });

  it("includes a remediation hint in the error message", async () => {
    const pool = makeMockPool([{ rows: [] }]);

    const err = await runVerifyTestSchema(pool, {
      expectedTables: TABLES,
      expectedColumns: [],
    }).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/Fix the schema error/i);
  });
});

// ─── 2. missing column ───────────────────────────────────────────────────────

describe("runVerifyTestSchema – missing column", () => {
  it("throws when one spot-checked column is absent", async () => {
    // All tables present, but "ads.rejection_note" is missing.
    const colRows = COLUMNS.filter(
      ([t, c]) => !(t === "ads" && c === "rejection_note")
    ).map(([table_name, column_name]) => ({ table_name, column_name }));

    const pool = makeMockPool([allTablesPresent(), { rows: colRows }]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: COLUMNS,
      })
    ).rejects.toThrow(/1 column\(s\) are missing/);
  });

  it("names the missing column as table.column in the error", async () => {
    const colRows = COLUMNS.filter(
      ([t, c]) => !(t === "ads" && c === "rejection_note")
    ).map(([table_name, column_name]) => ({ table_name, column_name }));

    const pool = makeMockPool([allTablesPresent(), { rows: colRows }]);

    const err = await runVerifyTestSchema(pool, {
      expectedTables: TABLES,
      expectedColumns: COLUMNS,
    }).catch((e: unknown) => e);

    expect((err as Error).message).toContain("• ads.rejection_note");
  });

  it("names every missing column when several are absent", async () => {
    // Return no columns at all — simulates a deeply partial push.
    const pool = makeMockPool([allTablesPresent(), { rows: [] }]);

    const err = await runVerifyTestSchema(pool, {
      expectedTables: TABLES,
      expectedColumns: COLUMNS,
    }).catch((e: unknown) => e);

    expect((err as Error).message).toContain(`${COLUMNS.length} column(s) are missing`);
    for (const [t, c] of COLUMNS) {
      expect((err as Error).message).toContain(`• ${t}.${c}`);
    }
  });

  it("includes a remediation hint about drizzle-kit push output", async () => {
    const pool = makeMockPool([allTablesPresent(), { rows: [] }]);

    const err = await runVerifyTestSchema(pool, {
      expectedTables: TABLES,
      expectedColumns: COLUMNS,
    }).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/drizzle-kit push output/i);
  });

  it("succeeds when all tables are present but expectedColumns is empty", async () => {
    // No column check to perform — should resolve without a second DB round-trip.
    const pool = makeMockPool([allTablesPresent(), { rows: [] }]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: [],
      })
    ).resolves.toBeUndefined();
  });
});

// ─── 3. clean schema ─────────────────────────────────────────────────────────

describe("runVerifyTestSchema – clean schema", () => {
  it("resolves when all expected tables and columns are present", async () => {
    const pool = makeMockPool([allTablesPresent(), allColumnsPresent()]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: COLUMNS,
      })
    ).resolves.toBeUndefined();
  });

  it("resolves when extra tables exist beyond the expected set", async () => {
    // Extra tables in the DB (e.g. from a previous migration) must not cause a failure.
    const extraRows = [
      ...TABLES.map((t) => ({ tablename: t })),
      { tablename: "drizzle_migrations" },
      { tablename: "__legacy_table" },
    ];
    const pool = makeMockPool([{ rows: extraRows }, allColumnsPresent()]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: COLUMNS,
      })
    ).resolves.toBeUndefined();
  });

  it("resolves when extra columns exist beyond the spot-checked set", async () => {
    // Extra columns returned by information_schema must not cause a failure.
    const extraCols = [
      ...COLUMNS.map(([table_name, column_name]) => ({
        table_name,
        column_name,
      })),
      { table_name: "users", column_name: "created_at" },
      { table_name: "ads", column_name: "updated_at" },
    ];
    const pool = makeMockPool([allTablesPresent(), { rows: extraCols }]);

    await expect(
      runVerifyTestSchema(pool, {
        expectedTables: TABLES,
        expectedColumns: COLUMNS,
      })
    ).resolves.toBeUndefined();
  });

  it("resolves immediately when both expectedTables and expectedColumns are empty", async () => {
    // Edge case: called with nothing to check — should not query the DB at all
    // or throw for any reason.  Provide responses for both queries just in case.
    const pool = makeMockPool([{ rows: [] }, { rows: [] }]);

    await expect(
      runVerifyTestSchema(pool, { expectedTables: [], expectedColumns: [] })
    ).resolves.toBeUndefined();
  });
});
