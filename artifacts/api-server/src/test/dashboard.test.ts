import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable, currencyRatesTable } from "@workspace/db";
import { createAdminUser } from "./helpers";

// The admin dashboard route requires at least one currency_rates row.  Seed
// one once before these tests run so the route returns 200 rather than 500.
beforeAll(async () => {
  const [existing] = await db.select().from(currencyRatesTable).limit(1);
  if (!existing) {
    await db.insert(currencyRatesTable).values({ base: "USD", quote: "GMD", rate: 60 });
  }
});

// ---------------------------------------------------------------------------
// Session role re-sync — demotion guard (dashboard/admin route)
//
// requireAdmin calls isSessionStillValid() on every request, which re-reads
// the user's role from the DB and syncs it onto req.session.role.  An admin
// demoted in the DB must therefore lose access on their very next request —
// no grace period, no need to invalidate the session cookie.
// ---------------------------------------------------------------------------

describe("dashboard routes — session role re-sync (demotion guard)", () => {
  it(
    "an admin demoted to member in the DB immediately loses access to GET /dashboard/admin",
    async () => {
      const admin = await createAdminUser("dashboard-demotion");

      // Confirm access while still an admin.
      const before = await admin.agent.get("/api/dashboard/admin");
      expect(before.status, "admin should have access before demotion").toBe(200);

      // Revoke admin role directly in the DB (simulates demotion by another
      // admin or a security response action, without touching the session cookie).
      await db
        .update(usersTable)
        .set({ role: "member" })
        .where(eq(usersTable.id, admin.id));

      // Same session cookie, same agent — role re-sync must now return 403.
      const after = await admin.agent.get("/api/dashboard/admin");
      expect(
        after.status,
        "demoted admin's existing session must be rejected immediately on GET /dashboard/admin",
      ).toBe(403);
    },
  );
});
