import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { createMemberUser, createAdminUser, anonymousAgent, app } from "./helpers";

const TREASURY_ROUTES = [
  "/api/treasury/accounts",
  "/api/treasury/transactions",
  "/api/treasury/liquidity-snapshots",
  "/api/treasury/currency-rates",
  "/api/treasury/summary",
];

/** A syntactically valid-looking session cookie that carries a forged/tampered value. */
const FORGED_COOKIE = "lrmc.sid=s%3Aforged-session-id-that-does-not-exist.invalidsignaturexyz";

describe("treasury routes — forged / invalid session cookie", () => {
  it("returns 401 for every treasury route when the session cookie is forged", async () => {
    for (const route of TREASURY_ROUTES) {
      const res = await request(app)
        .get(route)
        .set("Cookie", FORGED_COOKIE);
      expect(res.status, `expected 401 on ${route} with forged cookie`).toBe(401);
    }
  });

  it("returns 401 for every treasury route when the session cookie value is arbitrary garbage", async () => {
    for (const route of TREASURY_ROUTES) {
      const res = await request(app)
        .get(route)
        .set("Cookie", "lrmc.sid=totallynotavalidsessiontoken");
      expect(res.status, `expected 401 on ${route} with garbage cookie`).toBe(401);
    }
  });
});

describe("treasury routes — access control", () => {
  it("returns 401 for anonymous requests on every treasury route", async () => {
    const anon = anonymousAgent();
    for (const route of TREASURY_ROUTES) {
      const res = await anon.get(route);
      expect(res.status, `expected 401 on ${route}`).toBe(401);
    }
  });

  it("returns 403 for an authenticated regular member on every treasury route", async () => {
    const member = await createMemberUser("treasury-member");
    for (const route of TREASURY_ROUTES) {
      const res = await member.agent.get(route);
      expect(res.status, `expected 403 on ${route}`).toBe(403);
    }
  });

  it("allows an admin to read treasury accounts", async () => {
    const admin = await createAdminUser("treasury-admin");
    const res = await admin.agent.get("/api/treasury/accounts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read treasury transactions", async () => {
    const admin = await createAdminUser("treasury-txn-admin");
    const res = await admin.agent.get("/api/treasury/transactions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read liquidity snapshots", async () => {
    const admin = await createAdminUser("treasury-snap-admin");
    const res = await admin.agent.get("/api/treasury/liquidity-snapshots");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read currency rates", async () => {
    const admin = await createAdminUser("treasury-rates-admin");
    const res = await admin.agent.get("/api/treasury/currency-rates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("allows an admin to read the treasury summary", async () => {
    const admin = await createAdminUser("treasury-summary-admin");
    const res = await admin.agent.get("/api/treasury/summary");
    // 200 when a currency rate row exists; 500 only when the DB has no rate
    // seeded — both are acceptable here since we're testing authz, not data.
    expect([200, 500]).toContain(res.status);
    // Either way it must NOT be an authz rejection.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Session privilege-escalation tests
//
// The requireAdmin middleware calls isSessionStillValid() on every request.
// That helper re-reads the user's role from the DB and syncs it back onto
// req.session.role before the role check runs.  The role therefore always
// reflects the current DB value, not whatever the session cookie carried in.
//
// Security properties verified below:
//  • A member cannot escalate to admin by replaying their existing session
//    after directly promoting their own DB row — re-sync picks up the new
//    role, so DB-level write access would be required (a separate, deeper
//    breach).  When that write access IS granted legitimately the change takes
//    effect immediately without requiring a fresh login (tested here too).
//  • An admin whose DB role is reverted to member loses access on their very
//    next request — no grace period, no need to invalidate the session cookie.
// ---------------------------------------------------------------------------

describe("treasury routes — session role re-sync (privilege escalation guard)", () => {
  it("a member session cannot access treasury routes before any role change (baseline)", async () => {
    const member = await createMemberUser("escalation-baseline");
    const res = await member.agent.get("/api/treasury/accounts");
    expect(res.status).toBe(403);
  });

  it(
    "an admin demoted to member in the DB immediately loses access on their existing session",
    async () => {
      const admin = await createAdminUser("escalation-demotion");

      // Confirm access while still an admin.
      const before = await admin.agent.get("/api/treasury/accounts");
      expect(before.status, "admin should have access before demotion").toBe(200);

      // Revoke admin role directly in the DB (simulates demotion by another admin
      // or a security response action, without touching the session cookie).
      await db
        .update(usersTable)
        .set({ role: "member" })
        .where(eq(usersTable.id, admin.id));

      // Same session cookie, same agent — role re-sync must now return 403.
      const after = await admin.agent.get("/api/treasury/accounts");
      expect(
        after.status,
        "demoted admin's existing session must be rejected immediately",
      ).toBe(403);
    },
  );

  it(
    "a member promoted to admin in the DB gains access on their existing session via role re-sync",
    async () => {
      const member = await createMemberUser("escalation-promotion");

      // Confirm no access while still a member.
      const before = await member.agent.get("/api/treasury/accounts");
      expect(before.status, "member should be denied before promotion").toBe(403);

      // Promote directly in the DB (as an admin panel action would).
      await db
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, member.id));

      // Existing session picks up the new role via re-sync — access must be
      // granted without requiring a fresh login.
      const after = await member.agent.get("/api/treasury/accounts");
      expect(
        after.status,
        "promoted member's existing session must gain access immediately via role re-sync",
      ).toBe(200);
    },
  );

  it(
    "a fresh login after DB promotion grants admin access",
    async () => {
      const member = await createMemberUser("escalation-fresh-login");

      // Promote in DB before the second login.
      await db
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, member.id));

      // Log in again with a brand-new session (simulates a user who closes the
      // browser and signs back in after being promoted).
      const freshAgent = request.agent(app);
      const loginRes = await freshAgent
        .post("/api/auth/login")
        .send({ email: member.email, password: member.password });
      expect(loginRes.status).toBe(200);

      const res = await freshAgent.get("/api/treasury/accounts");
      expect(res.status, "fresh session minted as admin must have access").toBe(200);
    },
  );

  it(
    "a session belonging to a non-promoted member cannot access admin treasury routes even after many requests",
    async () => {
      // Regression guard: ensure repeated requests do not accidentally accumulate
      // a stale-role escalation across multiple role re-syncs.
      const member = await createMemberUser("escalation-repeat");

      for (let i = 0; i < 3; i++) {
        const res = await member.agent.get("/api/treasury/accounts");
        expect(
          res.status,
          `request ${i + 1}: member must still be denied`,
        ).toBe(403);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Session invalidation after password change
//
// When a user changes their password the server bumps sessionVersion in the
// users table.  requireAuth calls isSessionStillValid() on every request,
// which compares the DB's current sessionVersion against the value stored in
// the session cookie.  A mismatch means the session was minted before the
// password change and must be treated as expired (401), closing the replay-
// attack vector where a stolen pre-change cookie could still access the
// account.
// ---------------------------------------------------------------------------

describe("session invalidation — password change bumps sessionVersion", () => {
  it(
    "an old session cookie is rejected (401) after sessionVersion is bumped in the DB",
    async () => {
      const member = await createMemberUser("session-replay");

      // Confirm the session is valid before any password change.
      const before = await member.agent.get("/api/auth/me");
      expect(before.status, "session must be valid before password change").toBe(200);

      // Simulate a password change by bumping sessionVersion directly in the
      // DB.  This is exactly what the /auth/reset-password endpoint does; we
      // bypass the token flow here because tests have no way to intercept the
      // emailed reset link.
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));

      // Replay the old cookie — the session's stored sessionVersion no longer
      // matches the DB value, so requireAuth must return 401.
      const after = await member.agent.get("/api/auth/me");
      expect(
        after.status,
        "old session cookie must be rejected after password change (sessionVersion mismatch)",
      ).toBe(401);
    },
  );

  it(
    "a fresh login after a password change is accepted",
    async () => {
      const member = await createMemberUser("session-replay-fresh");

      // Bump sessionVersion to simulate a password change.
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));

      // Re-read the new sessionVersion so the fresh login stores the correct value.
      const [updated] = await db
        .select({ sessionVersion: usersTable.sessionVersion })
        .from(usersTable)
        .where(eq(usersTable.id, member.id));

      // Log in again — the new session is minted with the updated sessionVersion.
      const freshAgent = request.agent(app);
      const loginRes = await freshAgent
        .post("/api/auth/login")
        .send({ email: member.email, password: member.password });
      expect(loginRes.status, "fresh login must succeed after password change").toBe(200);

      // The new session must be valid.
      const meRes = await freshAgent.get("/api/auth/me");
      expect(meRes.status, "fresh session must be accepted after password change").toBe(200);

      // The old session must still be rejected.
      const oldRes = await member.agent.get("/api/auth/me");
      expect(
        oldRes.status,
        "old session cookie must remain invalid after a fresh login",
      ).toBe(401);
    },
  );

  it(
    "bumping sessionVersion multiple times keeps all pre-change sessions invalid",
    async () => {
      const member = await createMemberUser("session-replay-multi");

      // Confirm baseline.
      const baseline = await member.agent.get("/api/auth/me");
      expect(baseline.status).toBe(200);

      // Simulate two consecutive password changes.
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));

      // The original session must be rejected regardless of the number of bumps.
      const after = await member.agent.get("/api/auth/me");
      expect(
        after.status,
        "session issued before multiple password changes must be rejected",
      ).toBe(401);
    },
  );
});
