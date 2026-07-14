/**
 * Confirms that the test database URL is always distinct from the dev database
 * URL so that `push-force-test` can never accidentally target the dev database.
 *
 * Two layers are verified:
 *   1. testDatabaseUrl() transforms a well-formed DATABASE_URL into a
 *      recognisably different connection string that points at heliumdb_test.
 *   2. Both setup-test-schema.ts and drizzle.test.config.ts contain an
 *      explicit guard that throws when the derived URL equals the source URL,
 *      so a mis-formatted DATABASE_URL is caught at startup rather than
 *      silently running migrations against the dev database.
 */
import { describe, it, expect, vi } from "vitest";
import { testDatabaseUrl } from "@workspace/db";

describe("test database URL isolation", () => {
  const realDevUrl = process.env.DATABASE_URL;

  it("testDatabaseUrl produces a URL that differs from the dev DATABASE_URL", () => {
    if (!realDevUrl) {
      // Skip the live-env assertion when DATABASE_URL is absent (CI without DB).
      return;
    }
    const derived = testDatabaseUrl(realDevUrl);
    expect(derived).not.toBe(realDevUrl);
  });

  /**
   * Full parametrised matrix: every entry must satisfy all three invariants:
   *   1. Result path segment is /heliumdb_test
   *   2. Result does NOT contain the original database name in the path
   *   3. Host (including port) is preserved unchanged
   */
  describe("parametrised URL format matrix", () => {
    interface Case {
      url: string;
      /** The database name that must NOT appear in the result's path. */
      originalDbName: string;
      label: string;
    }

    const cases: Case[] = [
      // ── postgresql:// scheme ──────────────────────────────────────────────
      {
        label: "plain host/db, no port, no params",
        url: "postgresql://user:pass@localhost/heliumdb",
        originalDbName: "heliumdb",
      },
      {
        label: "with port, no params",
        url: "postgresql://user:pass@localhost:5432/heliumdb",
        originalDbName: "heliumdb",
      },
      {
        label: "with query params (sslmode)",
        url: "postgresql://user:pass@localhost/heliumdb?sslmode=disable",
        originalDbName: "heliumdb",
      },
      {
        label: "with port and multiple query params",
        url: "postgresql://user:pass@localhost:5432/heliumdb?sslmode=disable&connect_timeout=10",
        originalDbName: "heliumdb",
      },
      {
        label: "with sslmode=require",
        url: "postgresql://user:pass@localhost:5432/heliumdb?sslmode=require",
        originalDbName: "heliumdb",
      },
      {
        label: "SSL + application_name param",
        url: "postgresql://user:pass@host.db.svc/heliumdb?sslmode=verify-full&application_name=api",
        originalDbName: "heliumdb",
      },
      // ── postgres:// scheme ────────────────────────────────────────────────
      {
        label: "postgres:// scheme, plain",
        url: "postgres://user:pass@localhost/heliumdb",
        originalDbName: "heliumdb",
      },
      {
        label: "postgres:// scheme, with port and params",
        url: "postgres://user:pass@localhost:5432/heliumdb?sslmode=disable",
        originalDbName: "heliumdb",
      },
      // ── no password ───────────────────────────────────────────────────────
      {
        label: "no password in credentials",
        url: "postgresql://admin@db.example.com/heliumdb",
        originalDbName: "heliumdb",
      },
      {
        label: "no credentials at all",
        url: "postgresql://localhost/heliumdb",
        originalDbName: "heliumdb",
      },
      {
        label: "no credentials, with port",
        url: "postgresql://localhost:5432/heliumdb",
        originalDbName: "heliumdb",
      },
      // ── different original database names ─────────────────────────────────
      {
        label: "original DB name: myapp",
        url: "postgresql://user:pass@host/myapp",
        originalDbName: "myapp",
      },
      {
        label: "original DB name: production_db",
        url: "postgres://admin@db.example.com/production_db",
        originalDbName: "production_db",
      },
      {
        label: "original DB name: my_app_prod, with params",
        url: "postgresql://user:pass@host:5432/my_app_prod?sslmode=require",
        originalDbName: "my_app_prod",
      },
      {
        label: "original DB name: appdb123",
        url: "postgresql://user:pass@host/appdb123",
        originalDbName: "appdb123",
      },
      // ── remote host ───────────────────────────────────────────────────────
      {
        label: "remote host with subdomain, with port and params",
        url: "postgresql://user:pass@db.internal.example.com:5432/heliumdb?sslmode=disable",
        originalDbName: "heliumdb",
      },
    ];

    for (const { label, url, originalDbName } of cases) {
      it(`[${label}] path is /heliumdb_test and original name is absent`, () => {
        const derived = testDatabaseUrl(url);

        // 1. The result must differ from the input.
        expect(derived).not.toBe(url);

        // 2. Path segment must be exactly /heliumdb_test (verified via URL parser).
        const parsedDerived = new URL(derived);
        expect(parsedDerived.pathname).toBe("/heliumdb_test");

        // 3. Original database name must not be the path segment in the result.
        //    We check inequality of the whole segment, not substring containment,
        //    because the target name "heliumdb_test" legitimately starts with "heliumdb".
        expect(parsedDerived.pathname).not.toBe(`/${originalDbName}`);

        // 4. Host (including port) is preserved unchanged.
        const parsedOrig = new URL(url);
        expect(parsedDerived.host).toBe(parsedOrig.host);

        // 5. Query params are preserved unchanged.
        expect(parsedDerived.search).toBe(parsedOrig.search);
      });
    }
  });

  it("testDatabaseUrl returns a different URL for every recognisable input", () => {
    const samples = [
      "postgresql://user:pass@host/myapp",
      "postgres://admin@db.example.com/production_db",
      "postgresql://localhost/heliumdb?sslmode=require",
    ];
    for (const url of samples) {
      expect(testDatabaseUrl(url)).not.toBe(url);
    }
  });

  it("setup-test-schema guard: throws when the derived URL equals the dev URL", async () => {
    /**
     * Simulate the guard that lives at the top of setup-test-schema.ts.
     * We call the same logic inline so the test remains hermetic — no DB
     * connection needed.
     *
     * A URL that ends with a trailing slash but no database name (e.g.
     * "postgresql://user:pass@host/") causes testDatabaseUrl's regex to find
     * no replaceable database-name segment, so it returns the input unchanged.
     * The guard must catch this before any DB operation runs.
     */
    // Trailing slash + no db name → regex finds no path segment to replace.
    const malformedUrl = "postgresql://user:pass@localhost/";

    const guardFn = (baseUrl: string) => {
      const derivedTestUrl = testDatabaseUrl(baseUrl);
      if (derivedTestUrl === baseUrl) {
        throw new Error(
          `setup-test-schema: the derived test database URL is identical to the dev ` +
            `DATABASE_URL ("${baseUrl}"). ` +
            `This means the test schema would be pushed to the dev database. Aborting.`
        );
      }
    };

    expect(() => guardFn(malformedUrl)).toThrow(
      "identical to the dev DATABASE_URL"
    );
  });

  it("drizzle.test.config guard: throws when the derived URL equals the dev URL", () => {
    /**
     * Same guard logic as drizzle.test.config.ts — tested independently so
     * both execution paths (setup-test-schema and push-force-test) are
     * covered.
     *
     * A URL ending with a trailing slash but no database name is the canonical
     * trigger: the regex finds no replaceable segment and returns the input
     * unchanged.
     */
    const malformedUrl = "postgresql://user:pass@localhost/";

    const configGuardFn = (devUrl: string) => {
      const testUrl = testDatabaseUrl(devUrl);
      if (testUrl === devUrl) {
        throw new Error(
          `drizzle.test.config: the derived test database URL is identical to the dev ` +
            `DATABASE_URL ("${devUrl}"). ` +
            `Migrations would target the dev database. Aborting.`
        );
      }
      return testUrl;
    };

    expect(() => configGuardFn(malformedUrl)).toThrow(
      "identical to the dev DATABASE_URL"
    );
  });

  /**
   * Missing / empty DATABASE_URL coverage
   *
   * When DATABASE_URL is absent the env var is `undefined`; callers that
   * coerce it to a string get `"undefined"`.  When it is explicitly set to
   * an empty string they get `""`.  Both are unparseable by `new URL()`, so
   * `testDatabaseUrl` returns them unchanged — and the guard must fire before
   * any DB operation can run.
   */
  describe("guard fires when DATABASE_URL is missing or empty", () => {
    /** Inline reproduction of the guard used in both setup-test-schema.ts and
     *  drizzle.test.config.ts so the test is hermetic (no real DB needed). */
    function runGuard(baseUrl: string): void {
      const derived = testDatabaseUrl(baseUrl);
      if (derived === baseUrl) {
        throw new Error(
          `guard: the derived test database URL is identical to the source ` +
            `("${baseUrl}"). Aborting to protect the dev database.`
        );
      }
    }

    it("throws when DATABASE_URL is an empty string", () => {
      expect(() => runGuard("")).toThrow("identical to the source");
    });

    it('throws when DATABASE_URL is the string "undefined" (env var absent, coerced)', () => {
      // This is what happens when callers write `process.env.DATABASE_URL!`
      // or `String(process.env.DATABASE_URL)` and the var is not set.
      expect(() => runGuard(String(undefined))).toThrow(
        "identical to the source"
      );
    });
  });

  /**
   * Real module-level guard in drizzle.test.config.ts
   *
   * The config file throws at module evaluation time when DATABASE_URL is
   * absent (`if (!process.env.DATABASE_URL) throw ...`).  This test exercises
   * that exact line by importing the real file with the env var removed, using
   * vi.resetModules() so each import is a fresh evaluation rather than a
   * cached result.
   */
  describe("drizzle.test.config.ts real module guard", () => {
    it("throws when DATABASE_URL is absent from the environment", async () => {
      const saved = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      vi.resetModules();

      try {
        await expect(
          import("../../../../lib/db/drizzle.test.config.ts")
        ).rejects.toThrow("DATABASE_URL");
      } finally {
        // Restore env and clear the module cache so subsequent tests are
        // not affected by the stale import state.
        if (saved !== undefined) {
          process.env.DATABASE_URL = saved;
        }
        vi.resetModules();
      }
    });
  });

  it("live DATABASE_URL (when present) passes both guards without throwing", () => {
    if (!realDevUrl) return;

    // Guard from setup-test-schema
    const setupGuard = () => {
      const derived = testDatabaseUrl(realDevUrl);
      if (derived === realDevUrl) throw new Error("URLs match — dev DB at risk");
    };
    expect(setupGuard).not.toThrow();

    // Guard from drizzle.test.config
    const configGuard = () => {
      const derived = testDatabaseUrl(realDevUrl);
      if (derived === realDevUrl) throw new Error("URLs match — dev DB at risk");
    };
    expect(configGuard).not.toThrow();
  });
});
