import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, membershipsTable, currencyRatesTable } from "@workspace/db";
import { createAdminUser, createMemberUser } from "./helpers";

// The admin dashboard route requires at least one currency_rates row.
beforeAll(async () => {
  const [existing] = await db.select().from(currencyRatesTable).limit(1);
  if (!existing) {
    await db
      .insert(currencyRatesTable)
      .values({ base: "USD", quote: "GMD", rate: 60 });
  }
});

// ---------------------------------------------------------------------------
// Admin dashboard — live membership stat reflection
//
// /api/dashboard/admin queries the memberships table on every request with no
// caching layer. Changing a membership's status in the DB must be reflected
// immediately in the next GET /dashboard/admin response — no re-login or cache
// flush should be required.
// ---------------------------------------------------------------------------

describe("admin dashboard stats — immediate reflection of membership changes", () => {
  it(
    "flipping a membership active → pending immediately shifts totalMembers and pendingMemberships",
    async () => {
      const admin = await createAdminUser("dashboard-live-stats");

      // Create a member whose membership starts as "active" (createMemberUser
      // inserts an active membership by default).
      const member = await createMemberUser("dashboard-live-stats-member");

      // Read baseline counts.
      const before = await admin.agent.get("/api/dashboard/admin");
      expect(before.status, "admin dashboard should return 200").toBe(200);

      const totalMembersBefore: number = before.body.totalMembers;
      const pendingBefore: number = before.body.pendingMemberships;

      // Flip the membership status directly in the DB — simulating an admin
      // action or background process, without touching the HTTP session.
      await db
        .update(membershipsTable)
        .set({ status: "pending" })
        .where(eq(membershipsTable.userId, member.id));

      // Re-read the admin dashboard immediately, using the same session cookie
      // and without any cache flush.
      const after = await admin.agent.get("/api/dashboard/admin");
      expect(after.status, "admin dashboard should still return 200 after DB change").toBe(200);

      expect(
        after.body.totalMembers,
        "totalMembers must decrease by 1 immediately after the membership is set to pending",
      ).toBe(totalMembersBefore - 1);

      expect(
        after.body.pendingMemberships,
        "pendingMemberships must increase by 1 immediately after the membership is set to pending",
      ).toBe(pendingBefore + 1);
    },
  );

  it(
    "flipping a membership pending → active immediately shifts counts in the other direction",
    async () => {
      const admin = await createAdminUser("dashboard-live-stats-reverse");

      // Create member with active membership, then immediately set it to pending
      // so we start from a known pending state.
      const member = await createMemberUser("dashboard-live-stats-reverse-member");
      await db
        .update(membershipsTable)
        .set({ status: "pending" })
        .where(eq(membershipsTable.userId, member.id));

      const before = await admin.agent.get("/api/dashboard/admin");
      expect(before.status).toBe(200);

      const totalMembersBefore: number = before.body.totalMembers;
      const pendingBefore: number = before.body.pendingMemberships;

      // Approve the membership.
      await db
        .update(membershipsTable)
        .set({ status: "active" })
        .where(eq(membershipsTable.userId, member.id));

      const after = await admin.agent.get("/api/dashboard/admin");
      expect(after.status).toBe(200);

      expect(
        after.body.totalMembers,
        "totalMembers must increase by 1 immediately after the membership is activated",
      ).toBe(totalMembersBefore + 1);

      expect(
        after.body.pendingMemberships,
        "pendingMemberships must decrease by 1 immediately after the membership is activated",
      ).toBe(pendingBefore - 1);
    },
  );
});
