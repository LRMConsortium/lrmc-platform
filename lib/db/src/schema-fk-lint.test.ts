/**
 * Schema FK lint — usersTable.id references must declare onDelete.
 *
 * Any Drizzle column that references usersTable.id must include an explicit
 * { onDelete: ... } option.  Without it, Postgres uses RESTRICT by default,
 * which silently blocks user deletion instead of cascading or nullifying the
 * dependent row as intended.
 *
 * This test scans every file in lib/db/src/schema/ at the source level (no
 * import, no DB connection) so it catches violations the moment a migration
 * file is written, before it ever reaches the database.
 *
 * How the scan works
 * ------------------
 * For each `.ts` file in the schema directory the test:
 *   1. Finds every occurrence of `.references(() => usersTable.id` in the
 *      raw source text.
 *   2. Looks at the 200-character window that immediately follows the match —
 *      enough to cover the closing `)` of the call even when the arguments are
 *      spread across multiple lines.
 *   3. Fails if `onDelete` does not appear in that window, which means the
 *      option was omitted entirely or the window is suspiciously short (a
 *      pathological case that is itself worth flagging).
 *
 * Adding a new table
 * ------------------
 * If you add a column that references usersTable.id, always include one of:
 *   .references(() => usersTable.id, { onDelete: "cascade" })
 *   .references(() => usersTable.id, { onDelete: "set null" })
 *   .references(() => usersTable.id, { onDelete: "restrict" })   ← explicit opt-in
 *
 * The test will fail during `pnpm --filter @workspace/db run test` until the
 * option is present.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// Resolve the schema directory relative to this file so the test works
// regardless of the working directory vitest is launched from.
const SCHEMA_DIR = join(fileURLToPath(import.meta.url), "..", "schema");

// The number of characters to inspect after the start of a
// `.references(() => usersTable.id` token.  200 chars is enough for any
// realistic single- or multi-line call argument list.
const WINDOW = 200;

// Matches every occurrence of the token that starts a FK reference to users.id.
const REFERENCES_TOKEN = /\.references\(\s*\(\)\s*=>\s*usersTable\.id/g;

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  const files = readdirSync(SCHEMA_DIR).filter(
    (f) => f.endsWith(".ts") && f !== "index.ts"
  );

  for (const file of files) {
    const fullPath = join(SCHEMA_DIR, file);
    const src = readFileSync(fullPath, "utf-8");

    REFERENCES_TOKEN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = REFERENCES_TOKEN.exec(src)) !== null) {
      const tokenStart = match.index;
      const window = src.slice(tokenStart, tokenStart + WINDOW);

      if (!window.includes("onDelete")) {
        // Compute 1-based line number of the offending token.
        const lineNum = src.slice(0, tokenStart).split("\n").length;
        // Grab one line for the error message.
        const lineText = src.split("\n")[lineNum - 1]?.trim() ?? window;
        violations.push({ file, line: lineNum, snippet: lineText });
      }
    }
  }

  return violations;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("schema FK lint – usersTable.id references must declare onDelete", () => {
  const violations = collectViolations();

  it("finds no .references(() => usersTable.id) calls that omit onDelete", () => {
    const report = violations
      .map((v) => `  ${v.file}:${v.line}  →  ${v.snippet}`)
      .join("\n");

    expect(violations, `\nFK references missing onDelete:\n${report}\n`).toEqual(
      []
    );
  });

  it("scans at least one schema file (guards against a misconfigured path)", () => {
    const files = readdirSync(SCHEMA_DIR).filter(
      (f) => f.endsWith(".ts") && f !== "index.ts"
    );
    expect(files.length).toBeGreaterThan(0);
  });
});
