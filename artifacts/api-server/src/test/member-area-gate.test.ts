import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
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
