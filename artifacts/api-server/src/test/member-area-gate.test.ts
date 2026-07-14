import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, membershipsTable, internalMessagesTable, internalTicketsTable } from "@workspace/db";
import {
  createMemberUser,
  createMemberUserWithMembership,
  createAdminUser,
  anonymousAgent,
} from "./helpers";

/**
 * Confirms requireApprovedMembership actually blocks paid-but-unverified
 * (and unpaid) members from every member-area route file, and that it does
 * not block admins or genuinely approved members. See
 * src/middlewares/auth.ts for the gate itself.
 */
describe("member-area membership gate", () => {
  const scenarios = [
    { label: "unpaid, KYC not submitted", opts: { paymentStatus: "unpaid" as const, kycStatus: "not_submitted" as const } },
    { label: "paid but KYC pending", opts: { paymentStatus: "paid" as const, kycStatus: "pending" as const } },
    { label: "paid but KYC rejected", opts: { paymentStatus: "paid" as const, kycStatus: "rejected" as const } },
    { label: "no membership row at all", opts: { withMembership: false as const } },
  ];

  describe("GET /api/land-transactions (land.ts)", () => {
    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("land-gate", opts);
        const res = await member.agent.get("/api/land-transactions");
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("land-gate-ok");
      const res = await member.agent.get("/api/land-transactions");
      expect(res.status).toBe(200);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("land-gate-admin");
      const res = await admin.agent.get("/api/land-transactions");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/rides (mobility.ts)", () => {
    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("mobility-gate", opts);
        const res = await member.agent.get("/api/rides");
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("mobility-gate-ok");
      const res = await member.agent.get("/api/rides");
      expect(res.status).toBe(200);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("mobility-gate-admin");
      const res = await admin.agent.get("/api/rides");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/youth-employment-records (youth.ts)", () => {
    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("youth-gate", opts);
        const res = await member.agent.get("/api/youth-employment-records");
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("youth-gate-ok");
      const res = await member.agent.get("/api/youth-employment-records");
      expect(res.status).toBe(200);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("youth-gate-admin");
      const res = await admin.agent.get("/api/youth-employment-records");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/internal-messages (internal.ts)", () => {
    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("internal-gate", opts);
        const res = await member.agent.get("/api/internal-messages");
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("internal-gate-ok");
      const res = await member.agent.get("/api/internal-messages");
      expect(res.status).toBe(200);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("internal-gate-admin");
      const res = await admin.agent.get("/api/internal-messages");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/dashboard/member (dashboard.ts)", () => {
    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("dashboard-gate", opts);
        const res = await member.agent.get("/api/dashboard/member");
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("dashboard-gate-ok");
      const res = await member.agent.get("/api/dashboard/member");
      expect(res.status).toBe(200);
    });

    // Admins have their own /dashboard/admin; /dashboard/member is exempt for
    // admins purely because requireApprovedMembership short-circuits for the
    // admin role, but an admin still needs a membership row to get past the
    // 404 in the handler itself, so we only assert the gate lets them through
    // (no 403), not the full 200 payload shape.
    it("lets an admin through the gate regardless of membership state", async () => {
      const admin = await createAdminUser("dashboard-gate-admin");
      const res = await admin.agent.get("/api/dashboard/member");
      expect(res.status).not.toBe(403);
    });
  });

  describe("POST /api/property-listings (property-listings.ts)", () => {
    const body = {
      category: "property",
      title: "Test listing",
      location: "Banjul",
      priceCents: 10_000,
    };

    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("property-gate", opts);
        const res = await member.agent.post("/api/property-listings").send(body);
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("property-gate-ok");
      const res = await member.agent.post("/api/property-listings").send(body);
      expect(res.status).toBe(201);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("property-gate-admin");
      const res = await admin.agent.post("/api/property-listings").send(body);
      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/construction-projects (construction.ts)", () => {
    async function createContractor(agent: ReturnType<typeof anonymousAgent>) {
      const res = await agent
        .post("/api/construction-contractors")
        .send({ companyName: "Test Co", specialty: "Roofing" });
      expect(res.status).toBe(201);
      return res.body.id as number;
    }

    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("construction-gate", opts);
        const res = await member.agent
          .post("/api/construction-projects")
          .send({ contractorId: 1, title: "Test project", location: "Banjul", budgetCents: 1000 });
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("construction-gate-ok");
      const contractorId = await createContractor(member.agent);
      const res = await member.agent
        .post("/api/construction-projects")
        .send({ contractorId, title: "Test project", location: "Banjul", budgetCents: 1000 });
      expect(res.status).toBe(201);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("construction-gate-admin");
      const contractorId = await createContractor(admin.agent);
      const res = await admin.agent
        .post("/api/construction-projects")
        .send({ contractorId, title: "Test project", location: "Banjul", budgetCents: 1000 });
      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/ads (marketplace.ts)", () => {
    const body = {
      title: "Test ad",
      content: "Buy my thing",
      placement: "homepage",
    };

    for (const { label, opts } of scenarios) {
      it(`blocks a member who is ${label}`, async () => {
        const member = await createMemberUserWithMembership("ads-gate", opts);
        const res = await member.agent.post("/api/ads").send(body);
        expect(res.status).toBe(403);
      });
    }

    it("allows a paid + approved member", async () => {
      const member = await createMemberUser("ads-gate-ok");
      const res = await member.agent.post("/api/ads").send(body);
      expect(res.status).toBe(201);
    });

    it("allows an admin regardless of membership state", async () => {
      const admin = await createAdminUser("ads-gate-admin");
      const res = await admin.agent.post("/api/ads").send(body);
      expect(res.status).toBe(201);
    });
  });

  describe("/memberships routes stay reachable while pending (memberships.ts)", () => {
    it("lets a paid-but-unverified member submit KYC", async () => {
      const member = await createMemberUserWithMembership("memberships-kyc", {
        paymentStatus: "paid",
        kycStatus: "pending",
      });
      const res = await member.agent
        .post(`/api/memberships/${member.id}/kyc`)
        .send({ documentUrl: "https://example.com/id.png" });
      expect(res.status).not.toBe(403);
    });

    it("lets an unpaid member start checkout", async () => {
      const member = await createMemberUserWithMembership("memberships-checkout", {
        paymentStatus: "unpaid",
        kycStatus: "not_submitted",
      });
      const res = await member.agent.post(`/api/memberships/${member.id}/checkout`).send({});
      expect(res.status).not.toBe(403);
    });
  });

  it("anonymous callers still get 401 (not 403) from a gated route", async () => {
    const res = await anonymousAgent().get("/api/land-transactions");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Mid-session KYC revocation and payment reversal
//
// requireApprovedMembership reads the membership row fresh from the DB on
// every request, so revoking KYC approval or reversing a payment must
// immediately block the member's existing session — just like the admin
// demotion test in treasury.test.ts.  No session cookie invalidation or
// re-login should be required.
// ---------------------------------------------------------------------------

describe("member-area gate — mid-session membership status change", () => {
  it(
    "a KYC-approved member immediately loses access when their kycStatus is revoked to 'rejected'",
    async () => {
      // Start with a fully approved member and confirm access.
      const member = await createMemberUser("kyc-revocation");
      const before = await member.agent.get("/api/land-transactions");
      expect(before.status, "approved member must have access before revocation").toBe(200);

      // Simulate an admin revoking KYC approval directly in the DB (no new login).
      await db
        .update(membershipsTable)
        .set({ kycStatus: "rejected" })
        .where(eq(membershipsTable.userId, member.id));

      // Same session cookie — the middleware re-reads the row on every request,
      // so the revocation must take effect immediately.
      const after = await member.agent.get("/api/land-transactions");
      expect(
        after.status,
        "member's existing session must be blocked immediately after KYC revocation",
      ).toBe(403);
    },
  );

  it(
    "a KYC-approved member immediately loses access when their kycStatus is revoked to 'pending'",
    async () => {
      const member = await createMemberUser("kyc-revocation-pending");
      const before = await member.agent.get("/api/land-transactions");
      expect(before.status, "approved member must have access before revocation").toBe(200);

      await db
        .update(membershipsTable)
        .set({ kycStatus: "pending" })
        .where(eq(membershipsTable.userId, member.id));

      const after = await member.agent.get("/api/land-transactions");
      expect(
        after.status,
        "member's existing session must be blocked immediately after KYC set to pending",
      ).toBe(403);
    },
  );

  it(
    "a paid member immediately loses access when their paymentStatus is reversed to 'unpaid'",
    async () => {
      // Start with a fully approved member and confirm access.
      const member = await createMemberUser("payment-reversal");
      const before = await member.agent.get("/api/land-transactions");
      expect(before.status, "approved member must have access before payment reversal").toBe(200);

      // Simulate a chargeback / payment reversal directly in the DB.
      await db
        .update(membershipsTable)
        .set({ paymentStatus: "unpaid" })
        .where(eq(membershipsTable.userId, member.id));

      // Same session — access must be blocked immediately.
      const after = await member.agent.get("/api/land-transactions");
      expect(
        after.status,
        "member's existing session must be blocked immediately after payment reversal",
      ).toBe(403);
    },
  );

  it(
    "revocation blocks access across multiple member-area routes, not just one",
    async () => {
      const member = await createMemberUser("kyc-revocation-multi-route");

      // Revoke KYC.
      await db
        .update(membershipsTable)
        .set({ kycStatus: "rejected" })
        .where(eq(membershipsTable.userId, member.id));

      // The gate covers every protected route; spot-check a few.
      const routes = ["/api/land-transactions", "/api/rides", "/api/internal-messages"];
      for (const route of routes) {
        const res = await member.agent.get(route);
        expect(
          res.status,
          `existing session must be blocked on ${route} after KYC revocation`,
        ).toBe(403);
      }
    },
  );

  it(
    "a member re-approved after revocation can access member-area data on their existing session",
    async () => {
      const member = await createMemberUser("kyc-reapproval");

      // Revoke and confirm lockout.
      await db
        .update(membershipsTable)
        .set({ kycStatus: "rejected" })
        .where(eq(membershipsTable.userId, member.id));
      const revoked = await member.agent.get("/api/land-transactions");
      expect(revoked.status, "must be blocked after revocation").toBe(403);

      // Re-approve and confirm immediate access is restored.
      await db
        .update(membershipsTable)
        .set({ kycStatus: "approved" })
        .where(eq(membershipsTable.userId, member.id));
      const restored = await member.agent.get("/api/land-transactions");
      expect(
        restored.status,
        "access must be restored immediately after re-approval, without a fresh login",
      ).toBe(200);
    },
  );
});

// ---------------------------------------------------------------------------
// Membership row deletion
//
// requireApprovedMembership treats a missing row as 403 (same branch as an
// unpaid / unverified row). This suite confirms that a hard-delete of the
// membership row — e.g. an admin purge or a cascade delete — locks the user
// out on their very next request, without requiring a fresh login.
// ---------------------------------------------------------------------------

describe("membership row deletion", () => {
  it(
    "hard-deleting the membership row immediately blocks access on the same session (no re-login needed)",
    async () => {
      const member = await createMemberUser("row-deletion-lockout");

      // Confirm access before deletion.
      const before = await member.agent.get("/api/land-transactions");
      expect(before.status, "approved member must have access before row deletion").toBe(200);

      // Simulate an admin hard-purge of the membership row.
      await db.delete(membershipsTable).where(eq(membershipsTable.userId, member.id));

      // Same session cookie — the middleware re-reads the row on every request,
      // so the missing row must lock the user out immediately.
      const after = await member.agent.get("/api/land-transactions");
      expect(
        after.status,
        "member's existing session must be blocked immediately after membership row deletion",
      ).toBe(403);
    },
  );

  it(
    "re-inserting a paid + approved membership row immediately restores access on the same session (no re-login needed)",
    async () => {
      const member = await createMemberUser("row-deletion-restore");

      // Delete the membership row and confirm lockout.
      await db.delete(membershipsTable).where(eq(membershipsTable.userId, member.id));
      const locked = await member.agent.get("/api/land-transactions");
      expect(locked.status, "must be blocked after row deletion").toBe(403);

      // Re-insert a valid paid + approved membership row for the same userId.
      await db.insert(membershipsTable).values({
        userId: member.id,
        type: "renter",
        status: "active",
        paymentStatus: "paid",
        kycStatus: "approved",
      });

      // The middleware queries the DB fresh on every request — no caching means
      // the new row must restore access immediately without a fresh login.
      const restored = await member.agent.get("/api/land-transactions");
      expect(
        restored.status,
        "access must be restored immediately after re-inserting a valid membership row, without a fresh login",
      ).toBe(200);
    },
  );
});

// ---------------------------------------------------------------------------
// Dashboard stats reflect membership status changes mid-session
//
// /api/dashboard/member sits behind requireApprovedMembership, which reads
// the membership row fresh from the DB on every request. A status change
// (e.g. payment reversed, KYC revoked) must be visible immediately — either
// the response body shows the updated values or the gate returns 403. No
// re-login should be required in either direction.
// ---------------------------------------------------------------------------

describe("member dashboard — live membership status reflection", () => {
  it(
    "dashboard initially shows paid + approved status for a fully-approved member",
    async () => {
      const member = await createMemberUser("dashboard-stat-initial");
      const res = await member.agent.get("/api/dashboard/member");
      expect(res.status).toBe(200);
      expect(res.body.membership.paymentStatus).toBe("paid");
      expect(res.body.membership.kycStatus).toBe("approved");
    },
  );

  it(
    "after paymentStatus is set to 'unpaid', the same session gets 403 on /api/dashboard/member (no re-login needed)",
    async () => {
      const member = await createMemberUser("dashboard-stat-payment-reversal");

      // Confirm the member sees paid status before the change.
      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status).toBe(200);
      expect(before.body.membership.paymentStatus).toBe("paid");

      // Simulate a payment reversal directly in the DB.
      await db
        .update(membershipsTable)
        .set({ paymentStatus: "unpaid" })
        .where(eq(membershipsTable.userId, member.id));

      // The gate re-reads the row on every request — either 403 (gate blocks)
      // or 200 with the updated unpaid status is acceptable; stale "paid" is not.
      const after = await member.agent.get("/api/dashboard/member");
      if (after.status === 200) {
        expect(
          after.body.membership.paymentStatus,
          "if the handler runs, it must return the updated (unpaid) status — not the stale cached value",
        ).toBe("unpaid");
      } else {
        expect(
          after.status,
          "gate must block with 403 after payment reversal",
        ).toBe(403);
      }
    },
  );

  it(
    "after kycStatus is set to 'rejected', the same session gets 403 on /api/dashboard/member (no re-login needed)",
    async () => {
      const member = await createMemberUser("dashboard-stat-kyc-revocation");

      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status).toBe(200);
      expect(before.body.membership.kycStatus).toBe("approved");

      // Simulate an admin revoking KYC approval directly in the DB.
      await db
        .update(membershipsTable)
        .set({ kycStatus: "rejected" })
        .where(eq(membershipsTable.userId, member.id));

      const after = await member.agent.get("/api/dashboard/member");
      if (after.status === 200) {
        expect(
          after.body.membership.kycStatus,
          "if the handler runs, it must return the updated (rejected) kycStatus — not the stale cached value",
        ).toBe("rejected");
      } else {
        expect(
          after.status,
          "gate must block with 403 after KYC revocation",
        ).toBe(403);
      }
    },
  );

  it(
    "a member re-approved after payment reversal sees paid status restored on the same session",
    async () => {
      const member = await createMemberUser("dashboard-stat-reapproval");

      // Reverse payment, confirm lockout.
      await db
        .update(membershipsTable)
        .set({ paymentStatus: "unpaid" })
        .where(eq(membershipsTable.userId, member.id));
      const revoked = await member.agent.get("/api/dashboard/member");
      expect(revoked.status).toBe(403);

      // Restore payment status.
      await db
        .update(membershipsTable)
        .set({ paymentStatus: "paid" })
        .where(eq(membershipsTable.userId, member.id));

      const restored = await member.agent.get("/api/dashboard/member");
      expect(restored.status).toBe(200);
      expect(
        restored.body.membership.paymentStatus,
        "restored payment must appear immediately without a fresh login",
      ).toBe("paid");
    },
  );
});

describe("member-area gate — membership row deletion", () => {
  it(
    "a paid + KYC-approved member immediately loses access when their membership row is deleted",
    async () => {
      const member = await createMemberUser("membership-deletion");

      // Confirm the member has access before deletion.
      const before = await member.agent.get("/api/land-transactions");
      expect(
        before.status,
        "approved member must have access before membership row is deleted",
      ).toBe(200);

      // Hard-delete the membership row (simulates an admin purge or cascade delete).
      await db
        .delete(membershipsTable)
        .where(eq(membershipsTable.userId, member.id));

      // Same session cookie — the middleware re-reads the row on every request,
      // so the deletion must take effect immediately without a new login.
      const after = await member.agent.get("/api/land-transactions");
      expect(
        after.status,
        "member's existing session must be blocked immediately after membership row deletion",
      ).toBe(403);
    },
  );

  it(
    "the 403 body after deletion matches the standard membership-gate error message",
    async () => {
      const member = await createMemberUser("membership-deletion-body");

      await db
        .delete(membershipsTable)
        .where(eq(membershipsTable.userId, member.id));

      const res = await member.agent.get("/api/land-transactions");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe(
        "Full member's-area access requires a paid membership and approved identity verification",
      );
    },
  );

  it(
    "membership deletion blocks access across multiple member-area routes simultaneously",
    async () => {
      const member = await createMemberUser("membership-deletion-multi-route");

      await db
        .delete(membershipsTable)
        .where(eq(membershipsTable.userId, member.id));

      const routes = ["/api/land-transactions", "/api/rides", "/api/internal-messages"];
      for (const route of routes) {
        const res = await member.agent.get(route);
        expect(
          res.status,
          `existing session must be blocked on ${route} after membership deletion`,
        ).toBe(403);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Admin-visible membership detail after a hard purge
//
// GET /api/memberships/:id is admin-only. When a membership row is
// hard-deleted (admin purge or cascade), the detail endpoint must return 404
// rather than serving stale data or crashing.  A member-role session must
// still hit the 403 gate before reaching the handler — the gate fires first
// because /memberships/:id is NOT on the requireApprovedMembership exemption
// list.
// ---------------------------------------------------------------------------

describe("admin-purge membership row — membership-detail endpoint behaviour", () => {
  it(
    "admin GET to a purged membership returns 404, not 200 or 500",
    async () => {
      const member = await createMemberUser("purge-admin-404");
      const admin = await createAdminUser("purge-admin-404-admin");

      // Look up the membership row created by createMemberUser so we have the
      // numeric membership id to query.
      const [row] = await db
        .select({ id: membershipsTable.id })
        .from(membershipsTable)
        .where(eq(membershipsTable.userId, member.id));

      expect(row, "test precondition: membership row must exist before purge").toBeTruthy();
      const membershipId = row.id;

      // Confirm the admin can read the row before it is deleted.
      const before = await admin.agent.get(`/api/memberships/${membershipId}`);
      expect(before.status, "admin must be able to read membership before purge").toBe(200);

      // Hard-delete the membership row (simulates an admin purge).
      await db.delete(membershipsTable).where(eq(membershipsTable.id, membershipId));

      // The handler must return 404 — not 200 with stale data, and not a 500.
      const after = await admin.agent.get(`/api/memberships/${membershipId}`);
      expect(
        after.status,
        "admin GET to a purged membership must return 404",
      ).toBe(404);
    },
  );

  it(
    "member-role GET to a purged membership returns 403, not 404 (gate fires before the handler)",
    async () => {
      const member = await createMemberUser("purge-member-403");
      const admin = await createAdminUser("purge-member-403-admin");

      const [row] = await db
        .select({ id: membershipsTable.id })
        .from(membershipsTable)
        .where(eq(membershipsTable.userId, member.id));

      expect(row, "test precondition: membership row must exist before purge").toBeTruthy();
      const membershipId = row.id;

      // Hard-delete the membership row.
      await db.delete(membershipsTable).where(eq(membershipsTable.id, membershipId));

      // A member-role session must be blocked at the requireApprovedMembership
      // gate (403) because the endpoint is admin-only and the member no longer
      // has a valid membership row. The gate fires before the 404 handler.
      const res = await member.agent.get(`/api/memberships/${membershipId}`);
      expect(
        res.status,
        "member-role GET to a purged admin-only endpoint must return 403, not 404",
      ).toBe(403);
    },
  );
});

// ---------------------------------------------------------------------------
// Live counter freshness — unreadMessages and openTickets
//
// /api/dashboard/member queries both counters directly from the DB on every
// request (no in-memory cache). This suite confirms that inserting a new
// unread message or an open ticket into the DB is immediately visible on the
// very next dashboard call within the same session — no re-login required.
// A caching regression would cause the baseline count to be returned instead
// of the incremented one.
// ---------------------------------------------------------------------------

describe("member dashboard — unread message and open ticket counts update live", () => {
  it(
    "unreadMessages increments immediately after a new unread message is inserted for the member (same session, no re-login)",
    async () => {
      const member = await createMemberUser("live-unread-msg");
      // Use a second member as the sender so the FK constraint is satisfied.
      const sender = await createMemberUser("live-unread-msg-sender");

      // Baseline: read the current unreadMessages count.
      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status, "member must be able to reach the dashboard").toBe(200);
      const baselineUnread: number = before.body.unreadMessages;

      // Insert a new unread internal message directly into the DB,
      // bypassing the API so we isolate the counter-freshness concern.
      await db.insert(internalMessagesTable).values({
        senderId: sender.id,
        recipientId: member.id,
        subject: "Test subject",
        body: "Test body",
        // readAt intentionally omitted (null) so the message counts as unread.
      });

      // Re-read the dashboard on the same session — no logout/login between calls.
      const after = await member.agent.get("/api/dashboard/member");
      expect(after.status, "dashboard must still be reachable after message insert").toBe(200);
      expect(
        after.body.unreadMessages,
        "unreadMessages must reflect the newly inserted message without a re-login",
      ).toBe(baselineUnread + 1);
    },
  );

  it(
    "openTickets increments immediately after a new open ticket is inserted for the member (same session, no re-login)",
    async () => {
      const member = await createMemberUser("live-open-ticket");

      // Baseline: read the current openTickets count.
      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status, "member must be able to reach the dashboard").toBe(200);
      const baselineTickets: number = before.body.openTickets;

      // Insert a new open ticket directly into the DB for this member.
      await db.insert(internalTicketsTable).values({
        createdById: member.id,
        department: "support",
        subject: "Live count test ticket",
        description: "Inserted directly to verify live counter freshness.",
        // status defaults to "open"
      });

      // Re-read the dashboard on the same session.
      const after = await member.agent.get("/api/dashboard/member");
      expect(after.status, "dashboard must still be reachable after ticket insert").toBe(200);
      expect(
        after.body.openTickets,
        "openTickets must reflect the newly inserted ticket without a re-login",
      ).toBe(baselineTickets + 1);
    },
  );

  it(
    "unreadMessages does NOT increment when the inserted message is already marked read",
    async () => {
      const member = await createMemberUser("live-read-msg");
      const sender = await createMemberUser("live-read-msg-sender");

      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status).toBe(200);
      const baselineUnread: number = before.body.unreadMessages;

      // Insert a message that is already read (readAt set).
      await db.insert(internalMessagesTable).values({
        senderId: sender.id,
        recipientId: member.id,
        subject: "Already read",
        body: "This was already read.",
        readAt: new Date(),
      });

      const after = await member.agent.get("/api/dashboard/member");
      expect(after.status).toBe(200);
      expect(
        after.body.unreadMessages,
        "an already-read message must not inflate the unreadMessages counter",
      ).toBe(baselineUnread);
    },
  );

  it(
    "openTickets does NOT increment when the inserted ticket is already closed",
    async () => {
      const member = await createMemberUser("live-closed-ticket");

      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status).toBe(200);
      const baselineTickets: number = before.body.openTickets;

      // Insert a ticket with status = 'closed'.
      await db.insert(internalTicketsTable).values({
        createdById: member.id,
        department: "billing",
        subject: "Already closed ticket",
        description: "This ticket is already closed and must not count.",
        status: "closed",
      });

      const after = await member.agent.get("/api/dashboard/member");
      expect(after.status).toBe(200);
      expect(
        after.body.openTickets,
        "a closed ticket must not inflate the openTickets counter",
      ).toBe(baselineTickets);
    },
  );

  it(
    "both counters increment together when one message and one ticket are inserted simultaneously",
    async () => {
      const member = await createMemberUser("live-both-counters");
      const sender = await createMemberUser("live-both-counters-sender");

      const before = await member.agent.get("/api/dashboard/member");
      expect(before.status).toBe(200);
      const baselineUnread: number = before.body.unreadMessages;
      const baselineTickets: number = before.body.openTickets;

      // Insert both a message and a ticket in parallel.
      await Promise.all([
        db.insert(internalMessagesTable).values({
          senderId: sender.id,
          recipientId: member.id,
          subject: "Combined test message",
          body: "Test body for combined counter check.",
        }),
        db.insert(internalTicketsTable).values({
          createdById: member.id,
          department: "general",
          subject: "Combined test ticket",
          description: "Test description for combined counter check.",
        }),
      ]);

      const after = await member.agent.get("/api/dashboard/member");
      expect(after.status).toBe(200);
      expect(
        after.body.unreadMessages,
        "unreadMessages must reflect the new message without a re-login",
      ).toBe(baselineUnread + 1);
      expect(
        after.body.openTickets,
        "openTickets must reflect the new ticket without a re-login",
      ).toBe(baselineTickets + 1);
    },
  );
});
