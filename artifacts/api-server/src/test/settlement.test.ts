import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable, authTokensTable } from "@workspace/db";
import { createMemberUser, createAdminUser, anonymousAgent, app } from "./helpers";

describe("settlement-obligations routes — forged / invalid session cookie", () => {
  it("returns 401 on GET /settlement-obligations when the session cookie is forged", async () => {
    const res = await request(app)
      .get("/api/settlement-obligations")
      .set("Cookie", "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz");
    expect(res.status).toBe(401);
  });

  it("returns 401 on GET /settlement-obligations when the session cookie value is arbitrary garbage", async () => {
    const res = await request(app)
      .get("/api/settlement-obligations")
      .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken");
    expect(res.status).toBe(401);
  });

  it("returns 401 on PATCH /settlement-obligations/:id when the session cookie is forged", async () => {
    const res = await request(app)
      .patch("/api/settlement-obligations/1")
      .set("Cookie", "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz")
      .send({ status: "completed" });
    expect(res.status).toBe(401);
  });

  it("returns 401 on PATCH /settlement-obligations/:id when the session cookie value is arbitrary garbage", async () => {
    const res = await request(app)
      .patch("/api/settlement-obligations/1")
      .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken")
      .send({ status: "completed" });
    expect(res.status).toBe(401);
  });
});

describe("settlement-obligations routes — access control", () => {
  it("returns 401 for an anonymous GET /settlement-obligations", async () => {
    const res = await anonymousAgent().get("/api/settlement-obligations");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on GET /settlement-obligations", async () => {
    const member = await createMemberUser("settlement-member");
    const res = await member.agent.get("/api/settlement-obligations");
    expect(res.status).toBe(403);
  });

  it("allows an admin to list settlement obligations", async () => {
    const admin = await createAdminUser("settlement-admin");
    const res = await admin.agent.get("/api/settlement-obligations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 for an anonymous PATCH /settlement-obligations/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/settlement-obligations/1")
      .send({ status: "completed" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on PATCH /settlement-obligations/:id", async () => {
    const member = await createMemberUser("settlement-patch-member");
    const res = await member.agent
      .patch("/api/settlement-obligations/1")
      .send({ status: "completed" });
    expect(res.status).toBe(403);
  });

  it("returns 404 (not 401/403) when an admin patches a non-existent obligation", async () => {
    const admin = await createAdminUser("settlement-patch-admin");
    const res = await admin.agent
      .patch("/api/settlement-obligations/999999999")
      .send({ status: "settled" }); // valid enum value: pending | settled | overdue
    // Admin is authorised; 404 means the row doesn't exist, which is expected.
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Session role re-sync — demotion guard
//
// requireAdmin calls isSessionStillValid() on every request, which re-reads
// the user's role from the DB and syncs it onto req.session.role.  An admin
// demoted in the DB must therefore lose access on their very next request —
// no grace period, no need to invalidate the session cookie.
// ---------------------------------------------------------------------------

describe("settlement-obligations routes — session role re-sync (demotion guard)", () => {
  it(
    "an admin demoted to member in the DB immediately loses access to GET /settlement-obligations",
    async () => {
      const admin = await createAdminUser("settlement-demotion");

      // Confirm access while still an admin.
      const before = await admin.agent.get("/api/settlement-obligations");
      expect(before.status, "admin should have access before demotion").toBe(200);

      // Revoke admin role directly in the DB (simulates demotion by another
      // admin or a security response action, without touching the session cookie).
      await db
        .update(usersTable)
        .set({ role: "member" })
        .where(eq(usersTable.id, admin.id));

      // Same session cookie, same agent — role re-sync must now return 403.
      const after = await admin.agent.get("/api/settlement-obligations");
      expect(
        after.status,
        "demoted admin's existing session must be rejected immediately on GET /settlement-obligations",
      ).toBe(403);
    },
  );
});

// ---------------------------------------------------------------------------
// Deleted-user session guard
//
// isSessionStillValid() queries the DB for the user row on every request.
// If the row no longer exists the query returns nothing, the function returns
// false, and requireAdmin must respond with 401 — not 500 or a stale 200.
// ---------------------------------------------------------------------------

describe("settlement-obligations routes — deleted-user session guard", () => {
  it(
    "returns 401 on GET /settlement-obligations when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("settlement-deleted-get");

      // Confirm access while the user row still exists.
      const before = await admin.agent.get("/api/settlement-obligations");
      expect(before.status, "admin should have access before deletion").toBe(200);

      // Hard-delete the user row (simulates account deletion or a security
      // response action). Auth tokens must be removed first to satisfy the FK
      // constraint; the session cookie itself is unaffected and still signed.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Same session cookie — isSessionStillValid must return false → 401.
      const after = await admin.agent.get("/api/settlement-obligations");
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on GET /settlement-obligations",
      ).toBe(401);
    },
  );

  it(
    "returns 401 on PATCH /settlement-obligations/:id when the admin's user row has been deleted",
    async () => {
      const admin = await createAdminUser("settlement-deleted-patch");

      // Confirm access while the user row still exists (non-existent ID → 404,
      // which proves the request reached the route handler as an authorised admin).
      const before = await admin.agent
        .patch("/api/settlement-obligations/999999999")
        .send({ status: "settled" });
      expect(before.status, "admin should reach the route (404) before deletion").toBe(404);

      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      const after = await admin.agent
        .patch("/api/settlement-obligations/999999999")
        .send({ status: "settled" });
      expect(
        after.status,
        "deleted admin's session must be rejected with 401 on PATCH /settlement-obligations/:id",
      ).toBe(401);
    },
  );
});
