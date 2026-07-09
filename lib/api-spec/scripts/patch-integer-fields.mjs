#!/usr/bin/env node
/**
 * Post-codegen patch: add .int() to zod.number() / zod.coerce.number() for
 * every field declared as `type: integer` in openapi.yaml.
 *
 * Orval emits `zod.number()` for both OpenAPI `type: number` and `type: integer`.
 * This script restores the `.int()` constraint so it survives regeneration.
 *
 * Strategy: parse openapi.yaml as text to collect every field name whose
 * OpenAPI type is `integer`, then patch the generated zod schemas accordingly.
 * This replaces the old field-name-suffix heuristic (e.g. "*Cents") so all
 * integer fields — IDs, ratings, counts, monetary amounts, etc. — are covered.
 *
 * Run automatically after `orval` via the `codegen` script in api-spec/package.json.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Root of the monorepo (lib/api-spec/scripts → ../../..)
const root = resolve(__dirname, "..", "..", "..");
const generatedDir = join(root, "lib", "api-zod", "src", "generated");
const openapiPath = join(root, "lib", "api-spec", "openapi.yaml");

/**
 * Parse openapi.yaml as text and return the set of all field/parameter names
 * that are declared with `type: integer`.
 *
 * Two patterns are recognised:
 *
 * 1. Inline schema property (components/schemas):
 *      fieldName: { type: integer ... }
 *
 * 2. Path / query parameter block:
 *      - name: paramName
 *        ...
 *        schema:
 *          type: integer
 */
function collectIntegerFieldNames(yaml) {
  const names = new Set();

  // Pattern 1 – inline property:  "fieldName: { type: integer"
  const inlineRe = /^\s+(\w+):\s*\{[^}]*\btype:\s*integer\b/gm;
  for (const m of yaml.matchAll(inlineRe)) {
    names.add(m[1]);
  }

  // Pattern 2 – parameter block: capture `name: xxx` then look ahead up to
  // ~8 lines for `type: integer` (covers required:, in:, description:, schema:).
  // We do a two-pass: first collect all (offset, paramName) pairs, then check
  // whether the next occurrence of `type:` within the block is `integer`.
  const nameRe = /\bname:\s+(\w+)\s*\n/g;
  for (const m of yaml.matchAll(nameRe)) {
    const afterName = yaml.slice(m.index + m[0].length);
    // Take the next 400 characters (≈8 short lines) and check for type: integer
    const snippet = afterName.slice(0, 400);
    const typeMatch = snippet.match(/\btype:\s+(\w+)/);
    if (typeMatch && typeMatch[1] === "integer") {
      names.add(m[1]);
    }
  }

  return names;
}

/**
 * Build a regex that matches:
 *
 *   "fieldName": zod.number()          ← plain body/response field
 *   "fieldName": zod.coerce.number()   ← coerced path/query param
 *
 * but NOT when .int() is already present (negative lookahead).
 *
 * Group 1 captures the entire token up to and including `number()` so we
 * can append `.int()` right after it.
 */
function buildPattern(fieldNames) {
  if (fieldNames.size === 0) {
    // Nothing to patch – return a pattern that never matches.
    return /(?!)/g;
  }
  const alts = [...fieldNames]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  // Matches "field": zod[.coerce].number()  when NOT already followed by .int
  return new RegExp(
    `("(?:${alts})":\\s*zod(?:\\.coerce)?\\.number\\(\\))(?!\\.int)`,
    "g"
  );
}

function patchFile(filePath, pattern) {
  const original = readFileSync(filePath, "utf8");
  const patched = original.replace(pattern, "$1.int()");
  if (patched !== original) {
    writeFileSync(filePath, patched, "utf8");
    const added =
      (patched.match(/\.int\(\)/g) || []).length -
      (original.match(/\.int\(\)/g) || []).length;
    console.log(`  patched ${filePath.replace(root + "/", "")} (+${added} .int())`);
  }
}

function walkAndPatch(dir, pattern) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkAndPatch(full, pattern);
    } else if (full.endsWith(".ts")) {
      patchFile(full, pattern);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const yaml = readFileSync(openapiPath, "utf8");
const integerFields = collectIntegerFieldNames(yaml);

console.log(
  `patch-integer-fields: found ${integerFields.size} integer field(s) in spec: ${[...integerFields].sort().join(", ")}`
);

const pattern = buildPattern(integerFields);
walkAndPatch(generatedDir, pattern);

console.log("patch-integer-fields: done.");
