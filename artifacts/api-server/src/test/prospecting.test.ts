import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable, authTokensTable } from "@workspace/db";
import { createAdminUser, anonymousAgent } from "./helpers";

// ---------------------------------------------------------------------------
// Prospect leads — basic access control
// ---------------------------------------------------------------------------

describe("prospect-leads routes — access control", () => {
  it("returns 401 for anonymous GET /prospect-leads", async () => {
    const res = await anonymousAgent().get("/api/prospect-leads");
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous POST /prospect-leads", async () => {
    const res = await anonymousAgent()
      .post("/api/prospect-leads")
      .send({ name: "ACME", contact: "test@example.com", sector: "tech" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for anonymous PATCH /prospect-leads/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/prospect-leads/1")
      .send({ status: "contacted" });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Prospect leads — deleted-user session guard
//
// isSessionStillValid() queries the DB for the user row on every request.
// If the row no longer exists the query returns nothing, the function returns
// false, and requireAdmin must respond with 401 — not 500 or a stale 200.
// ---------------------------------------------------------------------------

describe("prospect-leads routes — deleted-user session guard", () => {
  it(
    "returns 401 on GET /prospect-leads when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("prospect-del-get");

      // Confirm access while the user row still exists.
      const before = await admin.agent.get("/api/prospect-leads");
      expect(before.status, "admin should have access before deletion").toBe(200);

      // Hard-delete the admin's user row (simulates account deletion or a
      // security response action). Auth tokens are removed first to satisfy the
      // FK constraint; the session cookie itself is unaffected and still signed.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Same session cookie — isSessionStillValid must return false → 401.
      const after = await admin.agent.get("/api/prospect-leads");
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on GET /prospect-leads",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on POST /prospect-leads when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("prospect-del-post");

      // Confirm the admin can reach the handler (201 with a valid body) while
      // the user row still exists.
      const before = await admin.agent
        .post("/api/prospect-leads")
        .send({ name: "ACME Corp", contact: "contact@acme.example", sector: "logistics" });
      expect(before.status, "admin should create a lead before deletion").toBe(201);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .post("/api/prospect-leads")
        .send({ name: "ACME Corp", contact: "contact@acme.example", sector: "logistics" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on POST /prospect-leads",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on PATCH /prospect-leads/:id when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("prospect-del-patch");

      // Confirm access while the user row still exists (non-existent ID → 404,
      // which proves the request reached the route handler as an authorised admin).
      const before = await admin.agent
        .patch("/api/prospect-leads/999999999")
        .send({ status: "contacted" });
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .patch("/api/prospect-leads/999999999")
        .send({ status: "contacted" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on PATCH /prospect-leads/:id",
      ).toBe(401);
    },
  );
});
