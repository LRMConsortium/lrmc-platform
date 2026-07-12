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

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: testDatabaseUrl(process.env.DATABASE_URL),
  },
});
