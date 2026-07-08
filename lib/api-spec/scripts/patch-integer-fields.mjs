#!/usr/bin/env node
/**
 * Post-codegen patch: add .int() to zod.number() for fields whose names end in
 * a monetary-integer suffix (e.g. priceCents, amountCents, budgetCents …).
 *
 * Orval emits `zod.number()` for both OpenAPI `type: number` and `type: integer`.
 * This script restores the `.int()` constraint so it survives regeneration.
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

/**
 * Field-name suffixes (case-sensitive) that indicate an integer cent value.
 * Extend this list if new integer-only monetary fields are added to the spec.
 */
const INTEGER_FIELD_SUFFIXES = ["Cents"];

/**
 * Build a regex that matches:
 *   "fieldNameCents": zod.number()
 * but NOT when .int() is already present (negative lookahead).
 *
 * Captured group 1 is the full `"field": zod.number()` token so we can
 * re-insert it with `.int()` appended right after `.number()`.
 */
function buildPattern(suffixes) {
  const suffixAlts = suffixes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Matches: "someFieldCents": zod.number()  — followed by anything EXCEPT .int
  return new RegExp(
    `("[a-zA-Z]*(${suffixAlts})": zod\\.number\\(\\))(?!\\.int)`,
    "g"
  );
}

function patchFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const pattern = buildPattern(INTEGER_FIELD_SUFFIXES);
  const patched = original.replace(pattern, "$1.int()");
  if (patched !== original) {
    writeFileSync(filePath, patched, "utf8");
    const count = (patched.match(/\.int\(\)/g) || []).length - (original.match(/\.int\(\)/g) || []).length;
    console.log(`  patched ${filePath.replace(root + "/", "")} (+${count} .int())`);
  }
}

function walkAndPatch(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkAndPatch(full);
    } else if (full.endsWith(".ts")) {
      patchFile(full);
    }
  }
}

console.log("patch-integer-fields: adding .int() to monetary cent fields …");
walkAndPatch(generatedDir);
console.log("patch-integer-fields: done.");
