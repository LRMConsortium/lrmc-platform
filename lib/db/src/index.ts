import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { testDatabaseUrl } from "./test-db-url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// When running tests, point at the isolated `heliumdb_test` database so that
// test rows never land in the shared dev database.
const connectionString =
  process.env.NODE_ENV === "test"
    ? testDatabaseUrl(process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
