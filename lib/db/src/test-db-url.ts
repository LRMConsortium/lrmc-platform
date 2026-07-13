/**
 * Shared utility: derives the test DATABASE_URL from the dev DATABASE_URL by
 * swapping the database name to `heliumdb_test`.
 *
 * Kept in its own file so it can be imported by both `setup-test-schema.ts`
 * (the CLI script) and `index.ts` (the runtime db client) without pulling in
 * any side-effect code.
 */
export function testDatabaseUrl(baseUrl: string): string {
  // Derive the test URL by swapping only the pathname's database segment to
  // `heliumdb_test`.  We parse the URL structurally so we never accidentally
  // rewrite query-param values, the authority, or the scheme — all of which
  // look like plausible regex targets in edge-case formats.
  //
  // If the URL cannot be parsed, or it has no meaningful pathname database
  // segment (pathname is empty, "/", or contains nested slashes), we return
  // the original string unchanged.  The caller (setup-test-schema.ts, index.ts)
  // compares the result against baseUrl and aborts if they are equal — that is
  // the intended safety-guard path for unrecognisable URL formats.
  let parsed: URL;
  try {
    // `new URL()` requires a scheme.  postgresql:// and postgres:// are not
    // registered WHATWG schemes, but the parser accepts unknown schemes as long
    // as the string is well-formed, which is sufficient for our purpose.
    parsed = new URL(baseUrl);
  } catch {
    // Unparseable URL — return unchanged so the safety guard fires.
    return baseUrl;
  }

  // pathname must be exactly "/<dbname>" — a single non-empty segment with no
  // nested slashes.  Anything else (empty, "/", "/a/b") is not a recognisable
  // database-name path, so we return unchanged.
  const pathname = parsed.pathname; // e.g. "/heliumdb" or ""
  if (!pathname || pathname === "/" || pathname.lastIndexOf("/") !== 0) {
    return baseUrl;
  }

  parsed.pathname = "/heliumdb_test";
  return parsed.toString();
}
