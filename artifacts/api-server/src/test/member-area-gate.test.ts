import { describe, it, expect } from "vitest";
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
      category: "apartment",
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
