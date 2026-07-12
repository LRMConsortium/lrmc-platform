import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable, authTokensTable } from "@workspace/db";
import { createMemberUser, createAdminUser, anonymousAgent, app } from "./helpers";


describe("risk-events routes — forged / invalid session cookie", () => {
  it("returns 401 on GET /risk-events when the session cookie is forged", async () => {
    const res = await request(app)
      .get("/api/risk-events")
      .set("Cookie", "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz");
    expect(res.status).toBe(401);
  });

  it("returns 401 on GET /risk-events when the session cookie value is arbitrary garbage", async () => {
    const res = await request(app)
      .get("/api/risk-events")
      .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken");
    expect(res.status).toBe(401);
  });

  it("returns 401 on PATCH /risk-events/:id when the session cookie is forged", async () => {
    const res = await request(app)
      .patch("/api/risk-events/1")
      .set("Cookie", "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz")
      .send({ status: "resolved" });
    expect(res.status).toBe(401);
  });

  it("returns 401 on PATCH /risk-events/:id when the session cookie value is arbitrary garbage", async () => {
    const res = await request(app)
      .patch("/api/risk-events/1")
      .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken")
      .send({ status: "resolved" });
    expect(res.status).toBe(401);
  });
});

describe("risk-events routes — access control", () => {
  it("returns 401 for an anonymous GET /risk-events", async () => {
    const res = await anonymousAgent().get("/api/risk-events");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on GET /risk-events", async () => {
    const member = await createMemberUser("risk-member");
    const res = await member.agent.get("/api/risk-events");
    expect(res.status).toBe(403);
  });

  it("allows an admin to list risk events", async () => {
    const admin = await createAdminUser("risk-admin");
    const res = await admin.agent.get("/api/risk-events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 for an anonymous PATCH /risk-events/:id", async () => {
    const res = await anonymousAgent()
      .patch("/api/risk-events/1")
      .send({ status: "resolved" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular member on PATCH /risk-events/:id", async () => {
    const member = await createMemberUser("risk-patch-member");
    const res = await member.agent
      .patch("/api/risk-events/1")
      .send({ status: "resolved" });
    expect(res.status).toBe(403);
  });

  it("returns 404 (not 401/403) when an admin patches a non-existent risk event", async () => {
    const admin = await createAdminUser("risk-patch-admin");
    const res = await admin.agent
      .patch("/api/risk-events/999999999")
      .send({ status: "resolved" });
    // Admin is authorised; 404 means the row doesn't exist, which is expected.
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Expired session — user row deleted from DB
//
// A cryptographically valid cookie whose userId no longer exists in the DB
// must be treated as expired (401) rather than causing a 500 crash.
// isSessionStillValid() returns false when the DB query returns no user row,
// so requireAdmin must reject these requests cleanly.
// ---------------------------------------------------------------------------

describe("risk-events routes — expired session (user row deleted)", () => {
  it(
    "returns 401 on risk-events routes when the session owner's user row has been deleted",
    async () => {
      const admin = await createAdminUser("risk-deleted-user");

      // Confirm the session is valid before deletion.
      const before = await admin.agent.get("/api/risk-events");
      expect(before.status, "session must be valid before user deletion").toBe(200);

      // Hard-delete the user row from the DB. This simulates an account
      // deletion while the user still holds a valid, signed session cookie.
      // auth_tokens has a FK on users.id, so clean that up first.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Replay the still-signed cookie against risk-events routes. The
      // session signature is cryptographically valid but the userId no longer
      // maps to any DB row, so isSessionStillValid() returns false → 401.
      const listRes = await admin.agent.get("/api/risk-events");
      expect(
        listRes.status,
        "GET /risk-events must return 401 after user row deleted (not a 500 crash)",
      ).toBe(401);

      const patchRes = await admin.agent
        .patch("/api/risk-events/1")
        .send({ status: "resolved" });
      expect(
        patchRes.status,
        "PATCH /risk-events/:id must return 401 after user row deleted (not a 500 crash)",
      ).toBe(401);
    },
  );
});

// ---------------------------------------------------------------------------
// Session role re-sync — demotion guard
//
// requireAdmin calls isSessionStillValid() on every request, which re-reads
// the user's role from the DB and syncs it onto req.session.role.  An admin
// demoted in the DB must therefore lose access on their very next request —
// no grace period, no need to invalidate the session cookie.
// ---------------------------------------------------------------------------

describe("risk-events routes — session role re-sync (demotion guard)", () => {
  it(
    "an admin demoted to member in the DB immediately loses access to GET /risk-events",
    async () => {
      const admin = await createAdminUser("risk-demotion");

      // Confirm access while still an admin.
      const before = await admin.agent.get("/api/risk-events");
      expect(before.status, "admin should have access before demotion").toBe(200);

      // Revoke admin role directly in the DB (simulates demotion by another
      // admin or a security response action, without touching the session cookie).
      await db
        .update(usersTable)
        .set({ role: "member" })
        .where(eq(usersTable.id, admin.id));

      // Same session cookie, same agent — role re-sync must now return 403.
      const after = await admin.agent.get("/api/risk-events");
      expect(
        after.status,
        "demoted admin's existing session must be rejected immediately on GET /risk-events",
      ).toBe(403);
    },
  );
});
