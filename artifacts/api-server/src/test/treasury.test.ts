import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, authTokensTable } from "@workspace/db";
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

// ---------------------------------------------------------------------------
// Expired session — user row deleted from DB
//
// A cryptographically valid cookie whose userId no longer exists in the DB
// must be treated as expired (401) rather than causing a 500 crash.
// isSessionStillValid() returns false when the DB query returns no user row,
// so requireAdmin must reject these requests cleanly.
// ---------------------------------------------------------------------------

describe("treasury routes — expired session (user row deleted)", () => {
  it(
    "returns 401 on every treasury route when the session owner's user row has been deleted",
    async () => {
      const admin = await createAdminUser("treasury-deleted-user");

      // Confirm the session is valid before deletion.
      const before = await admin.agent.get("/api/treasury/accounts");
      expect(before.status, "session must be valid before user deletion").toBe(200);

      // Hard-delete the user row from the DB. This simulates an account
      // deletion while the user still holds a valid, signed session cookie.
      // auth_tokens has a FK on users.id, so clean that up first.
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, admin.id));
      await db.delete(usersTable).where(eq(usersTable.id, admin.id));

      // Replay the still-signed cookie against every treasury route. The
      // session signature is cryptographically valid but the userId no longer
      // maps to any DB row, so isSessionStillValid() returns false → 401.
      for (const route of TREASURY_ROUTES) {
        const res = await admin.agent.get(route);
        expect(
          res.status,
          `expected 401 on ${route} after user row deleted (not a 500 crash)`,
        ).toBe(401);
      }
    },
  );
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

  it(
    "a session minted between two rapid resets is rejected; only the post-final-reset session is valid",
    async () => {
      // This covers the concurrent-reset race: two password-reset completions
      // in quick succession.  Each one bumps sessionVersion.  A session minted
      // after the first bump (e.g. from the first reset's own login) must be
      // invalidated by the second bump — only a session carrying the final
      // sessionVersion is accepted.

      // Session A — minted at the original sessionVersion (pre-any-reset).
      const member = await createMemberUser("session-concurrent-reset");
      const sessionA = member.agent; // already logged in

      // Confirm session A is initially valid.
      const beforeAny = await sessionA.get("/api/auth/me");
      expect(beforeAny.status, "session A must be valid before any reset").toBe(200);

      // First password reset: bump sessionVersion (v → v+1).
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));

      // Session B — minted immediately after the first reset (sessionVersion = v+1).
      const sessionB = request.agent(app);
      const loginB = await sessionB
        .post("/api/auth/login")
        .send({ email: member.email, password: member.password });
      expect(loginB.status, "login after first reset must succeed").toBe(200);

      // Confirm session B is valid at this point (first reset is the latest).
      const midB = await sessionB.get("/api/auth/me");
      expect(midB.status, "session B must be valid after first reset").toBe(200);

      // Second password reset: bump sessionVersion again (v+1 → v+2).
      await db
        .update(usersTable)
        .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
        .where(eq(usersTable.id, member.id));

      // Session C — minted after the second (final) reset (sessionVersion = v+2).
      const sessionC = request.agent(app);
      const loginC = await sessionC
        .post("/api/auth/login")
        .send({ email: member.email, password: member.password });
      expect(loginC.status, "login after second reset must succeed").toBe(200);

      // Session A (pre-first-reset) must be rejected.
      const afterA = await sessionA.get("/api/auth/me");
      expect(
        afterA.status,
        "session A (pre-first-reset) must be rejected after both resets",
      ).toBe(401);

      // Session B (between the two resets) must also be rejected — this is the
      // key concurrent-reset property: the second bump invalidates session B
      // even though session B was itself minted after a valid reset.
      const afterB = await sessionB.get("/api/auth/me");
      expect(
        afterB.status,
        "session B (minted between the two resets) must be rejected after the second reset",
      ).toBe(401);

      // Session C (minted after the final reset) must be accepted.
      const afterC = await sessionC.get("/api/auth/me");
      expect(
        afterC.status,
        "session C (minted after final reset) must be the only valid session",
      ).toBe(200);
    },
  );
});

// ---------------------------------------------------------------------------
// Session invalidation after explicit logout
//
// When a user calls POST /auth/logout the server destroys the session record
// in the store (req.session.destroy) and clears the cookie.  An attacker who
// captured the cookie before logout must receive 401 — not 200 — when
// replaying it against any protected endpoint.  This test captures the raw
// Set-Cookie value from a direct login so it can be replayed as a "stolen"
// cookie after the legitimate user has logged out.
// ---------------------------------------------------------------------------

describe("session invalidation — logout fully destroys the session", () => {
  it(
    "a replayed session cookie returns 401 on GET /auth/me after the user logs out",
    async () => {
      const member = await createMemberUser("logout-replay-me");

      // Capture the raw cookie from a direct login (bypassing the agent's
      // internal jar so we can replay the exact header value later).
      const directLoginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: member.email, password: member.password });
      expect(directLoginRes.status, "direct login must succeed").toBe(200);

      const rawCookie = (directLoginRes.headers["set-cookie"] as string[] | undefined)?.[0];
      expect(rawCookie, "login response must set a session cookie").toBeTruthy();

      // Confirm the captured cookie is valid before logout.
      const before = await request(app)
        .get("/api/auth/me")
        .set("Cookie", rawCookie!);
      expect(before.status, "captured cookie must be valid before logout").toBe(200);

      // Log out using that exact cookie — the session is destroyed server-side.
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", rawCookie!);
      expect(logoutRes.status, "logout must succeed with 204").toBe(204);

      // Replay the cookie — session store no longer has it; requireAuth must
      // return 401.
      const after = await request(app)
        .get("/api/auth/me")
        .set("Cookie", rawCookie!);
      expect(
        after.status,
        "stolen session cookie must be rejected (401) after the user logs out",
      ).toBe(401);
    },
  );

  it(
    "a stolen admin session cookie returns 401 on treasury routes after logout",
    async () => {
      const admin = await createAdminUser("logout-replay-treasury");

      // Capture a fresh session cookie via a direct login.
      const directLoginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: admin.email, password: admin.password });
      expect(directLoginRes.status, "direct admin login must succeed").toBe(200);

      const rawCookie = (directLoginRes.headers["set-cookie"] as string[] | undefined)?.[0];
      expect(rawCookie, "login response must set a session cookie").toBeTruthy();

      // Confirm the captured cookie grants treasury access before logout.
      const before = await request(app)
        .get("/api/treasury/accounts")
        .set("Cookie", rawCookie!);
      expect(before.status, "captured admin cookie must grant treasury access before logout").toBe(200);

      // Log out — session is destroyed.
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", rawCookie!);
      expect(logoutRes.status, "logout must succeed with 204").toBe(204);

      // Replay the "stolen" cookie against the treasury — must be 401, not 200 or 403.
      const after = await request(app)
        .get("/api/treasury/accounts")
        .set("Cookie", rawCookie!);
      expect(
        after.status,
        "stolen admin cookie must be fully invalidated (401) after logout",
      ).toBe(401);
    },
  );
});

// ---------------------------------------------------------------------------
// Concurrent logout — only the logging-out session is destroyed
//
// When two devices (agents) are logged in as the same user simultaneously,
// logging out from one device must NOT invalidate the other device's session.
// Each session is an independent store entry keyed by its own session ID.
// req.session.destroy() removes only the calling session, leaving unrelated
// sessions for the same userId untouched.
// ---------------------------------------------------------------------------

describe("session invalidation — concurrent logout only kills the requesting session", () => {
  it(
    "logging out from one session leaves a second independent session for the same user valid",
    async () => {
      // Register a single shared user account.
      const userA = await createMemberUser("concurrent-logout");

      // Agent A is already logged in (session cookie held by the agent).
      // Open a second independent session for the same credentials — simulating
      // a second device or browser tab.
      const agentB = request.agent(app);
      const loginB = await agentB
        .post("/api/auth/login")
        .send({ email: userA.email, password: userA.password });
      expect(loginB.status, "agent B must be able to log in independently").toBe(200);

      // Confirm both sessions are valid before any logout.
      const beforeA = await userA.agent.get("/api/auth/me");
      expect(beforeA.status, "agent A session must be valid before logout").toBe(200);

      const beforeB = await agentB.get("/api/auth/me");
      expect(beforeB.status, "agent B session must be valid before logout").toBe(200);

      // Agent A logs out — only A's session should be destroyed.
      const logoutRes = await userA.agent.post("/api/auth/logout");
      expect(logoutRes.status, "agent A logout must return 204").toBe(204);

      // Agent A's old cookie must now be rejected.
      const afterA = await userA.agent.get("/api/auth/me");
      expect(
        afterA.status,
        "agent A session must be invalidated (401) after logout",
      ).toBe(401);

      // Agent B's independent session must remain fully valid — it was not the
      // session that was destroyed by the logout call.
      const afterB = await agentB.get("/api/auth/me");
      expect(
        afterB.status,
        "agent B session must remain valid (200) after agent A logs out",
      ).toBe(200);
    },
  );

  it(
    "each device can log out independently without affecting the other",
    async () => {
      // Two agents, same user — log out B first, then A.
      const userA = await createMemberUser("concurrent-logout-order");

      const agentB = request.agent(app);
      const loginB = await agentB
        .post("/api/auth/login")
        .send({ email: userA.email, password: userA.password });
      expect(loginB.status, "agent B must log in successfully").toBe(200);

      // Agent B logs out first.
      const logoutB = await agentB.post("/api/auth/logout");
      expect(logoutB.status, "agent B logout must return 204").toBe(204);

      // Agent A's session must be completely unaffected.
      const afterBLogout = await userA.agent.get("/api/auth/me");
      expect(
        afterBLogout.status,
        "agent A session must remain valid (200) after agent B logs out",
      ).toBe(200);

      // Now agent A logs out too.
      const logoutA = await userA.agent.post("/api/auth/logout");
      expect(logoutA.status, "agent A logout must return 204").toBe(204);

      // Both sessions are now dead.
      const afterALogout = await userA.agent.get("/api/auth/me");
      expect(
        afterALogout.status,
        "agent A session must be invalidated (401) after its own logout",
      ).toBe(401);

      // Agent B's session was already invalidated by its own earlier logout;
      // confirm it is still rejected.
      const afterBFinal = await agentB.get("/api/auth/me");
      expect(
        afterBFinal.status,
        "agent B session must remain invalidated (401) after its own earlier logout",
      ).toBe(401);
    },
  );
});
