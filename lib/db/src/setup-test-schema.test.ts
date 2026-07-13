/**
 * Tests for runSetupTestSchema — the core logic that tears down and recreates
 * heliumdb_test before every test run.
 *
 * Two failure paths are exercised:
 *
 * 1. Lingering connection:  a real pg.Client holds an open connection to
 *    heliumdb_test while setup runs.  The setup must terminate that connection
 *    and complete without error.
 *
 * 2. Stale-DB guard:  if DROP DATABASE appeared to succeed but the database
 *    still shows up in pg_database (e.g. a connection prevented the real drop),
 *    runSetupTestSchema must throw rather than silently continuing — exercising
 *    the post-DROP existence check directly.
 */

import { describe, it, expect, vi, type MockedFunction } from "vitest";
import pg from "pg";
import { runSetupTestSchema } from "./setup-test-schema-core";

const { Pool, Client } = pg;

// ─── helpers ────────────────────────────────────────────────────────────────

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set to run these tests.");
  return url;
}

// ─── unit test: stale-DB guard (mock pool) ──────────────────────────────────

describe("runSetupTestSchema – stale-DB guard (mocked pool)", () => {
  it("throws when DROP appears to succeed but the database still exists", async () => {
    /**
     * Simulate the sequence of pg_database queries.  The implementation
     * path when the DB already exists:
     *
     *  call 1 — initial existence check          → exists: true
     *  call 2 — ALTER DATABASE … LIMIT 0         → (DDL, no rows)
     *  call 3 — SELECT pg_terminate_backend       → [] (no connections)
     *  call 4 — waitUntilDrained: SELECT count(*) → count: "0" (drained)
     *  call 5 — DROP DATABASE IF EXISTS           → (DDL, no rows)
     *  call 6 — post-DROP existence check         → exists: true  ← bug!
     *
     * The function must throw on call 6 instead of proceeding to CREATE.
     */
    const queryResponses = [
      { rows: [{ exists: true }] },        // 1. initial check: DB exists
      { rows: [] },                         // 2. ALTER DATABASE … LIMIT 0
      { rows: [] },                         // 3. pg_terminate_backend (0)
      { rows: [{ count: "0" }] },           // 4. drain poll: already empty
      { rows: [] },                         // 5. DROP DATABASE IF EXISTS
      { rows: [{ exists: true }] },         // 6. post-DROP check: still exists!
    ];

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

    const mockPool = { query: mockQuery } as unknown as InstanceType<
      typeof Pool
    >;

    await expect(runSetupTestSchema(mockPool)).rejects.toThrow(
      "DROP DATABASE heliumdb_test appeared to succeed but the database still exists"
    );

    // All 6 calls must have been made (drain poll reached).
    expect(mockQuery).toHaveBeenCalledTimes(6);

    // CREATE DATABASE must NOT have been called after the failed guard.
    const calls = mockQuery.mock.calls.map((c) => String(c[0]).trim());
    expect(calls.some((sql) => sql.startsWith("CREATE DATABASE"))).toBe(false);
  });
});

// ─── integration test: lingering connection (real postgres) ─────────────────

describe("runSetupTestSchema – lingering connection (real postgres)", () => {
  it(
    "succeeds even when an idle connection to heliumdb_test is held open",
    async () => {
      const baseUrl = requireDatabaseUrl();

      // Derive the test DB URL using the same utility the setup script uses.
      const { testDatabaseUrl } = await import("./test-db-url");
      const testUrl = testDatabaseUrl(baseUrl);

      const adminPool = new Pool({ connectionString: baseUrl });

      try {
        // ── Step 1: ensure heliumdb_test exists so we can connect to it ──
        const existsResult = await adminPool.query<{ exists: boolean }>(
          `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'heliumdb_test') AS exists`
        );
        if (!existsResult.rows[0]?.exists) {
          await adminPool.query("CREATE DATABASE heliumdb_test");
        }

        // ── Step 2: open a real idle connection to heliumdb_test ──────────
        // This simulates a hung test process that never released its pool.
        const lingeringClient = new Client({ connectionString: testUrl });
        await lingeringClient.connect();

        // pg emits an "error" event when the server terminates the connection
        // via pg_terminate_backend.  Without a listener Node throws an
        // unhandled-error exception.  We expect this, so swallow it.
        lingeringClient.on("error", () => {
          // intentionally ignored — termination by setup script is expected
        });

        // Capture the backend PID so we can later confirm it was cleaned up.
        const pidResult = await adminPool.query<{ pid: number }>(
          `SELECT pid FROM pg_stat_activity WHERE datname = 'heliumdb_test' AND pid <> pg_backend_pid() ORDER BY backend_start DESC LIMIT 1`
        );
        const lingeringPid = pidResult.rows[0]?.pid;
        expect(lingeringPid).toBeTypeOf("number");

        try {
          // ── Step 3: run setup while the connection is still open ─────────
          // The setup must terminate the lingering backend and complete.
          await expect(runSetupTestSchema(adminPool)).resolves.toBeUndefined();

          // ── Step 4: verify the lingering backend is gone ─────────────────
          const pidGoneResult = await adminPool.query<{ count: string }>(
            `SELECT count(*) AS count FROM pg_stat_activity WHERE pid = $1`,
            [lingeringPid]
          );
          const stillActive = parseInt(
            pidGoneResult.rows[0]?.count ?? "0",
            10
          );
          expect(stillActive).toBe(0);

          // ── Step 5: verify heliumdb_test was freshly recreated ──────────
          const verifyResult = await adminPool.query<{ exists: boolean }>(
            `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'heliumdb_test') AS exists`
          );
          expect(verifyResult.rows[0]?.exists).toBe(true);
        } finally {
          // The lingering client was terminated by the setup script; calling
          // end() on an already-terminated connection may throw — swallow it.
          try {
            await lingeringClient.end();
          } catch {
            // Expected: server terminated the connection.
          }
        }
      } finally {
        await adminPool.end();
      }
    },
    // Extra headroom: setup polls for drain + DROP/CREATE DB DDL.
    20_000
  );
});
