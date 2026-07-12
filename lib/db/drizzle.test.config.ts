/**
 * Drizzle Kit config for pushing the schema into the isolated `heliumdb_test`
 * database.  Used exclusively by the api-server pretest script.
 */
import { defineConfig } from "drizzle-kit";
import path from "path";
import { testDatabaseUrl } from "./src/test-db-url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const devUrl = process.env.DATABASE_URL;
const testUrl = testDatabaseUrl(devUrl);

// Safety guard: refuse to run if the derived test URL equals the dev URL.
// This would happen if DATABASE_URL has an unrecognised format and the database
// name substitution silently no-ops, which would push schema changes directly
// onto the dev database.
if (testUrl === devUrl) {
  throw new Error(
    `drizzle.test.config: the derived test database URL is identical to the dev ` +
      `DATABASE_URL ("${devUrl}"). ` +
      `Migrations would target the dev database. Aborting. ` +
      `Ensure DATABASE_URL ends with a recognisable database name, e.g. .../heliumdb.`
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: testUrl,
  },
});
