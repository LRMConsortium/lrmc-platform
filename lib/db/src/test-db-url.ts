/**
 * Shared utility: derives the test DATABASE_URL from the dev DATABASE_URL by
 * swapping the database name to `heliumdb_test`.
 *
 * Kept in its own file so it can be imported by both `setup-test-schema.ts`
 * (the CLI script) and `index.ts` (the runtime db client) without pulling in
 * any side-effect code.
 */
export function testDatabaseUrl(baseUrl: string): string {
  // Replace the path segment (database name) while preserving query params.
  // e.g. postgresql://user:pass@host/heliumdb?sslmode=disable
  //   => postgresql://user:pass@host/heliumdb_test?sslmode=disable
  return baseUrl.replace(/\/([^/?]+)(\?|$)/, "/heliumdb_test$2");
}
