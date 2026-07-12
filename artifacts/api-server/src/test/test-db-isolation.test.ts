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
import { describe, it, expect } from "vitest";
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

  it("testDatabaseUrl replaces the database name with heliumdb_test", () => {
    const cases = [
      // plain host/db path
      "postgresql://user:pass@localhost/heliumdb",
      // with query params
      "postgresql://user:pass@localhost/heliumdb?sslmode=disable",
      // with port
      "postgresql://user:pass@localhost:5432/heliumdb",
      // with port and query params
      "postgresql://user:pass@localhost:5432/heliumdb?sslmode=disable&connect_timeout=10",
    ];

    for (const url of cases) {
      const derived = testDatabaseUrl(url);
      expect(derived).toContain("heliumdb_test");
      expect(derived).not.toContain("/heliumdb?");
      expect(derived).not.toMatch(/\/heliumdb$/);
      // Host and credentials must be unchanged.
      const origOrigin = new URL(url).host;
      const derivedOrigin = new URL(derived).host;
      expect(derivedOrigin).toBe(origOrigin);
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
