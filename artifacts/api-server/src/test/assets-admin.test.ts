import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable, authTokensTable } from "@workspace/db";
import { createAdminUser, anonymousAgent } from "./helpers";

// ---------------------------------------------------------------------------
// Assets admin actions — basic access control
// ---------------------------------------------------------------------------

describe("assets admin routes — access control", () => {
  it("returns 401 for anonymous POST /assets/:id/approve", async () => {
    const res = await anonymousAgent().post("/api/assets/1/approve");
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /assets/:id/reject", async () => {
    const res = await anonymousAgent()
      .post("/api/assets/1/reject")
      .send({ reason: "Not suitable" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /assets/:id/assign", async () => {
    const res = await anonymousAgent()
      .post("/api/assets/1/assign")
      .send({ module: "treasury" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /assets/:id/link-revenue", async () => {
    const res = await anonymousAgent()
      .post("/api/assets/1/link-revenue")
      .send({ revenueType: "subscription" });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Assets admin actions — deleted-user session guard
//
// isSessionStillValid() queries the DB for the user row on every request.
// If the row no longer exists the query returns nothing, the function returns
// false, and requireAdmin must respond with 401 — not 500 or a stale 200.
//
// All four admin-only asset actions (approve, reject, assign, link-revenue)
// look up the asset by ID before acting, so a non-existent asset ID → 404
// proves the request reached the route handler as an authorised admin.
// ---------------------------------------------------------------------------

describe("assets admin routes — deleted-user session guard", () => {
  it(
    "returns 401 on POST /assets/:id/approve when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("asset-del-approve");

      // Non-existent asset ID → 404 proves the request cleared requireAdmin.
      const before = await admin.agent.post("/api/assets/999999999/approve");
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      // Hard-delete the admin's user row (simulates account deletion or a
      // security response action). Auth tokens are removed first to satisfy the
      // FK constraint; the session cookie itself is unaffected and still signed.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Same session cookie — isSessionStillValid must return false → 401.
      const after = await admin.agent.post("/api/assets/999999999/approve");
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on POST /assets/:id/approve",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on POST /assets/:id/reject when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("asset-del-reject");

      const before = await admin.agent
        .post("/api/assets/999999999/reject")
        .send({ reason: "Not suitable" });
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .post("/api/assets/999999999/reject")
        .send({ reason: "Not suitable" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on POST /assets/:id/reject",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on POST /assets/:id/assign when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("asset-del-assign");

      const before = await admin.agent
        .post("/api/assets/999999999/assign")
        .send({ module: "treasury" });
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .post("/api/assets/999999999/assign")
        .send({ module: "treasury" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on POST /assets/:id/assign",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on POST /assets/:id/link-revenue when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("asset-del-link-revenue");

      const before = await admin.agent
        .post("/api/assets/999999999/link-revenue")
        .send({ revenueType: "subscription" });
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .post("/api/assets/999999999/link-revenue")
        .send({ revenueType: "subscription" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on POST /assets/:id/link-revenue",
      ).toBe(401);
    },
  );
});
