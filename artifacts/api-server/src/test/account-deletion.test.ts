/**
 * account-deletion.test.ts
 *
 * Authorization and correctness tests for:
 *   DELETE /account        — self-service deletion (requireAuth)
 *   DELETE /users/:id      — admin-only deletion (requireAdmin)
 *
 * Stripe checkout-session cancellation is not exercised here because Stripe
 * credentials are not available in the test environment.  The cancellation
 * logic is best-effort and wrapped in a try/catch, so missing credentials do
 * not prevent deletion.
 */

import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  createMemberUser,
  createAdminUser,
  anonymousAgent,
} from "./helpers";

// ---------------------------------------------------------------------------
// DELETE /account — self-service
// ---------------------------------------------------------------------------

describe("DELETE /account — self-service account deletion", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await anonymousAgent().delete("/api/account");
    expect(res.status).toBe(401);
  });

  it("returns 204 and removes the user row from the database", async () => {
    const user = await createMemberUser("acct-del-self");

    const res = await user.agent.delete("/api/account");
    expect(res.status).toBe(204);

    const [row] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    expect(row, "user row must be removed after self-deletion").toBeUndefined();
  });

  it("invalidates the session so subsequent authenticated requests return 401", async () => {
    const user = await createMemberUser("acct-del-session");

    const deleteRes = await user.agent.delete("/api/account");
    expect(deleteRes.status).toBe(204);

    // The same agent's session cookie should no longer be valid
    const meRes = await user.agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);
  });

  it("a second DELETE /account on the same (now-invalid) session returns 401", async () => {
    const user = await createMemberUser("acct-del-double");

    await user.agent.delete("/api/account");

    // Second attempt — session is gone, user row is gone
    const res = await user.agent.delete("/api/account");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /users/:id — admin-only
// ---------------------------------------------------------------------------

describe("DELETE /users/:id — admin-only account deletion", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const target = await createMemberUser("acct-admin-del-unauth-target");
    const res = await anonymousAgent().delete(`/api/users/${target.id}`);
    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-admin member attempts the endpoint", async () => {
    const actor = await createMemberUser("acct-admin-del-nonadmin-actor");
    const target = await createMemberUser("acct-admin-del-nonadmin-target");

    const res = await actor.agent.delete(`/api/users/${target.id}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when the target user does not exist", async () => {
    const admin = await createAdminUser("acct-admin-del-404");

    const res = await admin.agent.delete("/api/users/999999999");
    expect(res.status).toBe(404);
  });

  it("returns 400 for a non-integer user ID", async () => {
    const admin = await createAdminUser("acct-admin-del-badid");

    const res = await admin.agent.delete("/api/users/not-a-number");
    expect(res.status).toBe(400);
  });

  it("returns 204 and removes the target user row from the database", async () => {
    const admin = await createAdminUser("acct-admin-del-ok-admin");
    const target = await createMemberUser("acct-admin-del-ok-target");

    const res = await admin.agent.delete(`/api/users/${target.id}`);
    expect(res.status).toBe(204);

    const [row] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, target.id));
    expect(row, "target user row must be removed after admin deletion").toBeUndefined();
  });

  it("does not end the admin's own session when deleting a different user", async () => {
    const admin = await createAdminUser("acct-admin-del-nosession-admin");
    const target = await createMemberUser("acct-admin-del-nosession-target");

    await admin.agent.delete(`/api/users/${target.id}`);

    // Admin should still be authenticated
    const meRes = await admin.agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(admin.id);
  });

  it("an admin can delete their own account via DELETE /users/:id and loses session access", async () => {
    const admin = await createAdminUser("acct-admin-del-self");

    const res = await admin.agent.delete(`/api/users/${admin.id}`);
    expect(res.status).toBe(204);

    const meRes = await admin.agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);
  });
});
