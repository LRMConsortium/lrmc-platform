import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createAd(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/ads").send({
    title: "Authz Test Ad",
    content: "This ad is used to test authorization.",
    placement: "marketplace",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number; status: string };
}

describe("ads authorization", () => {
  it("rejects an unauthenticated PATCH with 401", async () => {
    const seller = await createMemberUser("ad-seller");
    const ad = await createAd(seller.agent);

    const { anonymousAgent } = await import("./helpers");
    const res = await anonymousAgent()
      .patch(`/api/ads/${ad.id}`)
      .send({ title: "No auth" });

    expect(res.status).toBe(401);
  });

  it("rejects a non-owner member PATCH with 403", async () => {
    const seller = await createMemberUser("ad-owner");
    const stranger = await createMemberUser("ad-stranger");
    const ad = await createAd(seller.agent);

    const res = await stranger.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows the owner to PATCH their own pending ad content", async () => {
    const seller = await createMemberUser("ad-self-edit");
    const ad = await createAd(seller.agent);

    const res = await seller.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ title: "My updated title", content: "Updated content" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("My updated title");
  });

  it("prevents the owner from setting status on their own ad", async () => {
    const seller = await createMemberUser("ad-status-hack");
    const ad = await createAd(seller.agent);

    // Owner sends status: "active" — server should strip it and succeed
    // (status field is ignored for non-admins; the update still returns 200
    //  but status must remain "pending")
    const res = await seller.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ status: "active", title: "Legit edit" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
  });

  it("allows an admin to change ad status", async () => {
    const seller = await createMemberUser("ad-admin-status-seller");
    const admin = await createAdminUser("ad-admin-status-admin");
    const ad = await createAd(seller.agent);

    const res = await admin.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("prevents the owner from editing an already-approved ad", async () => {
    const seller = await createMemberUser("ad-edit-approved-seller");
    const admin = await createAdminUser("ad-edit-approved-admin");
    const ad = await createAd(seller.agent);

    // Admin approves the ad
    await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

    // Owner tries to edit after approval
    const res = await seller.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ title: "Edit after approval" });

    expect(res.status).toBe(403);
  });

  it("allows the owner to DELETE their own pending ad", async () => {
    const seller = await createMemberUser("ad-delete-owner");
    const ad = await createAd(seller.agent);

    const res = await seller.agent.delete(`/api/ads/${ad.id}`);
    expect(res.status).toBe(204);
  });

  it("rejects a non-owner DELETE with 403", async () => {
    const seller = await createMemberUser("ad-delete-seller");
    const stranger = await createMemberUser("ad-delete-stranger");
    const ad = await createAd(seller.agent);

    const res = await stranger.agent.delete(`/api/ads/${ad.id}`);
    expect(res.status).toBe(403);
  });

  it("prevents owner from withdrawing an approved ad", async () => {
    const seller = await createMemberUser("ad-withdraw-approved-seller");
    const admin = await createAdminUser("ad-withdraw-approved-admin");
    const ad = await createAd(seller.agent);

    await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

    const res = await seller.agent.delete(`/api/ads/${ad.id}`);
    expect(res.status).toBe(403);
  });

  it("allows an admin to DELETE any ad", async () => {
    const seller = await createMemberUser("ad-admin-delete-seller");
    const admin = await createAdminUser("ad-admin-delete-admin");
    const ad = await createAd(seller.agent);

    // Approve first, then admin-delete (confirms admin bypasses pending restriction)
    await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });
    const res = await admin.agent.delete(`/api/ads/${ad.id}`);
    expect(res.status).toBe(204);
  });

  it("prevents the owner from editing a rejected ad", async () => {
    const seller = await createMemberUser("ad-edit-rejected-seller");
    const admin = await createAdminUser("ad-edit-rejected-admin");
    const ad = await createAd(seller.agent);

    // Admin rejects the ad
    await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

    // Owner attempts to edit after rejection — must be blocked the same as after approval
    const res = await seller.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ title: "Edit after rejection" });

    expect(res.status).toBe(403);
  });

  it("allows an admin to revert an active ad back to pending", async () => {
    const seller = await createMemberUser("ad-revert-pending-seller");
    const admin = await createAdminUser("ad-revert-pending-admin");
    const ad = await createAd(seller.agent);

    // Approve the ad first
    const approveRes = await admin.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ status: "active" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("active");

    // Admin reverts it back to pending (regression guard — must not be blocked)
    const revertRes = await admin.agent
      .patch(`/api/ads/${ad.id}`)
      .send({ status: "pending" });
    expect(revertRes.status).toBe(200);
    expect(revertRes.body.status).toBe("pending");
  });

  it("allows resubmission of a rejected ad with replacesAdId", async () => {
    const seller = await createMemberUser("ad-resubmit-ok-seller");
    const admin = await createAdminUser("ad-resubmit-ok-admin");
    const original = await createAd(seller.agent);

    // Admin rejects the ad
    await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

    // Seller resubmits referencing the rejected ad
    const res = await seller.agent.post("/api/ads").send({
      title: "Revised Ad",
      content: "Updated content after rejection.",
      placement: "marketplace",
      replacesAdId: original.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.parentAdId).toBe(original.id);
  });

  it("rejects resubmission referencing an ad not owned by the session user", async () => {
    const seller = await createMemberUser("ad-resubmit-stolen-seller");
    const attacker = await createMemberUser("ad-resubmit-stolen-attacker");
    const admin = await createAdminUser("ad-resubmit-stolen-admin");
    const original = await createAd(seller.agent);

    await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

    const res = await attacker.agent.post("/api/ads").send({
      title: "Stolen resubmit",
      content: "Attacker tries to reference another user's ad.",
      placement: "marketplace",
      replacesAdId: original.id,
    });

    expect(res.status).toBe(403);
  });

  it("rejects resubmission when the referenced ad is not rejected (pending)", async () => {
    const seller = await createMemberUser("ad-resubmit-pending-seller");
    const pendingAd = await createAd(seller.agent);

    const res = await seller.agent.post("/api/ads").send({
      title: "Premature resubmit",
      content: "Trying to replace a still-pending ad.",
      placement: "marketplace",
      replacesAdId: pendingAd.id,
    });

    expect(res.status).toBe(400);
  });

  it("rejects resubmission when the referenced ad is not rejected (active)", async () => {
    const seller = await createMemberUser("ad-resubmit-active-seller");
    const admin = await createAdminUser("ad-resubmit-active-admin");
    const activeAd = await createAd(seller.agent);

    await admin.agent.patch(`/api/ads/${activeAd.id}`).send({ status: "active" });

    const res = await seller.agent.post("/api/ads").send({
      title: "Replace active ad",
      content: "Trying to replace an approved ad.",
      placement: "marketplace",
      replacesAdId: activeAd.id,
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when replacesAdId references a non-existent ad", async () => {
    const seller = await createMemberUser("ad-resubmit-missing-seller");

    const res = await seller.agent.post("/api/ads").send({
      title: "Ghost resubmit",
      content: "Referencing an ad that does not exist.",
      placement: "marketplace",
      replacesAdId: 999999,
    });

    expect(res.status).toBe(404);
  });

  it("admin PATCH response includes parentAdId so moderation chain is visible", async () => {
    const seller = await createMemberUser("ad-chain-seller");
    const admin = await createAdminUser("ad-chain-admin");
    const original = await createAd(seller.agent);

    await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

    const resubmitRes = await seller.agent.post("/api/ads").send({
      title: "Chain Ad",
      content: "Second attempt after rejection.",
      placement: "marketplace",
      replacesAdId: original.id,
    });
    expect(resubmitRes.status).toBe(201);
    const resubmittedId = resubmitRes.body.id;

    // Admin reviews and the response must expose parentAdId
    const patchRes = await admin.agent
      .patch(`/api/ads/${resubmittedId}`)
      .send({ status: "active" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.parentAdId).toBe(original.id);
  });

  describe("GET /ads/:id rejection chain visibility", () => {
    async function buildTwoLevelChain(
      seller: Awaited<ReturnType<typeof createMemberUser>>,
      admin: Awaited<ReturnType<typeof createAdminUser>>,
      suffix: string,
    ) {
      // original → rejected → first resubmission (pending)
      const original = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });
      const resubRes = await seller.agent.post("/api/ads").send({
        title: `Resubmit ${suffix}`,
        content: "Second attempt.",
        placement: "marketplace",
        replacesAdId: original.id,
      });
      expect(resubRes.status).toBe(201);
      return { original, resubmitted: resubRes.body as { id: number; parentAdId: number } };
    }

    it("returns 404 for a non-existent ad id", async () => {
      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get("/api/ads/999999");
      expect(res.status).toBe(404);
    });

    it("admin sees rejectionChain with full ancestor history", async () => {
      const seller = await createMemberUser("get-ad-admin-chain-seller");
      const admin = await createAdminUser("get-ad-admin-chain-admin");
      const { original, resubmitted } = await buildTwoLevelChain(seller, admin, "admin-chain");

      const res = await admin.agent.get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(resubmitted.id);
      expect(Array.isArray(res.body.rejectionChain)).toBe(true);
      expect(res.body.rejectionChain).toHaveLength(1);
      expect(res.body.rejectionChain[0].id).toBe(original.id);
      expect(res.body.rejectionChain[0].status).toBe("rejected");
      expect(res.body.rejectionChain[0]).toHaveProperty("title");
      expect(res.body.rejectionChain[0]).toHaveProperty("createdAt");
    });

    it("admin sees parentAdId on the ad itself", async () => {
      const seller = await createMemberUser("get-ad-admin-parentid-seller");
      const admin = await createAdminUser("get-ad-admin-parentid-admin");
      const { original, resubmitted } = await buildTwoLevelChain(seller, admin, "admin-parentid");

      const res = await admin.agent.get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(200);
      expect(res.body.parentAdId).toBe(original.id);
    });

    it("unauthenticated user cannot fetch a pending ad by ID (status gate)", async () => {
      const seller = await createMemberUser("get-ad-anon-seller");
      const admin = await createAdminUser("get-ad-anon-admin");
      const { resubmitted } = await buildTwoLevelChain(seller, admin, "anon-get");

      const { anonymousAgent } = await import("./helpers");
      // Resubmitted ad is pending — non-admins get 404, so parentAdId and
      // rejectionChain are never exposed at all.
      const res = await anonymousAgent().get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(404);
    });

    it("member user cannot fetch a pending ad by ID (status gate)", async () => {
      const seller = await createMemberUser("get-ad-member-seller");
      const viewer = await createMemberUser("get-ad-member-viewer");
      const admin = await createAdminUser("get-ad-member-admin");
      const { resubmitted } = await buildTwoLevelChain(seller, admin, "member-get");

      // Resubmitted ad is pending — member gets 404, so parentAdId and
      // rejectionChain are never exposed at all.
      const res = await viewer.agent.get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(404);
    });

    it("ad with no parent shows empty rejectionChain for admin", async () => {
      const seller = await createMemberUser("get-ad-no-parent-seller");
      const admin = await createAdminUser("get-ad-no-parent-admin");
      const ad = await createAd(seller.agent);

      const res = await admin.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      // rejectionChain is optional; if present it must be empty
      if (res.body.rejectionChain !== undefined) {
        expect(res.body.rejectionChain).toHaveLength(0);
      }
    });

    it("unauthenticated GET /ads/:id on an active ad does not expose advertiserId", async () => {
      const seller = await createMemberUser("get-ad-anon-adverid-seller");
      const admin = await createAdminUser("get-ad-anon-adverid-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("advertiserId");
    });

    it("authenticated member GET /ads/:id on an active ad does not expose advertiserId", async () => {
      const seller = await createMemberUser("get-ad-member-adverid-seller");
      const viewer = await createMemberUser("get-ad-member-adverid-viewer");
      const admin = await createAdminUser("get-ad-member-adverid-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const res = await viewer.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("advertiserId");
    });

    it("admin GET /ads/:id on an active ad does include advertiserId", async () => {
      const seller = await createMemberUser("get-ad-admin-adverid-seller");
      const admin = await createAdminUser("get-ad-admin-adverid-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const res = await admin.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("advertiserId");
      expect(typeof res.body.advertiserId).toBe("number");
    });

    async function buildApprovedResubmission(
      seller: Awaited<ReturnType<typeof createMemberUser>>,
      admin: Awaited<ReturnType<typeof createAdminUser>>,
      suffix: string,
    ) {
      // original → rejected → resubmitted → approved (active with non-null parentAdId)
      const original = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });
      const resubRes = await seller.agent.post("/api/ads").send({
        title: `Approved Resubmit ${suffix}`,
        content: "Second attempt — will be approved.",
        placement: "marketplace",
        replacesAdId: original.id,
      });
      expect(resubRes.status).toBe(201);
      const resubmitted = resubRes.body as { id: number; parentAdId: number };
      await admin.agent.patch(`/api/ads/${resubmitted.id}`).send({ status: "active" });
      return { original, resubmitted };
    }

    it("unauthenticated GET /ads/:id on an approved resubmission does not expose parentAdId", async () => {
      const seller = await createMemberUser("get-ad-anon-resubmit-parentid-seller");
      const admin = await createAdminUser("get-ad-anon-resubmit-parentid-admin");
      const { resubmitted } = await buildApprovedResubmission(seller, admin, "anon");

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("parentAdId");
    });

    it("authenticated member GET /ads/:id on an approved resubmission does not expose parentAdId", async () => {
      const seller = await createMemberUser("get-ad-member-resubmit-parentid-seller");
      const viewer = await createMemberUser("get-ad-member-resubmit-parentid-viewer");
      const admin = await createAdminUser("get-ad-member-resubmit-parentid-admin");
      const { resubmitted } = await buildApprovedResubmission(seller, admin, "member");

      const res = await viewer.agent.get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("parentAdId");
    });

    it("admin GET /ads/:id on an approved resubmission does include parentAdId", async () => {
      const seller = await createMemberUser("get-ad-admin-resubmit-parentid-seller");
      const admin = await createAdminUser("get-ad-admin-resubmit-parentid-admin");
      const { original, resubmitted } = await buildApprovedResubmission(seller, admin, "admin");

      const res = await admin.agent.get(`/api/ads/${resubmitted.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("parentAdId", original.id);
    });
  });

  describe("GET /ads/:id status gate", () => {
    it("returns 404 for a pending ad to an unauthenticated caller", async () => {
      const seller = await createMemberUser("get-ad-gate-anon-pending-seller");
      const ad = await createAd(seller.agent);

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for a rejected ad to an unauthenticated caller", async () => {
      const seller = await createMemberUser("get-ad-gate-anon-rejected-seller");
      const admin = await createAdminUser("get-ad-gate-anon-rejected-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for a pending ad to a member caller", async () => {
      const seller = await createMemberUser("get-ad-gate-member-pending-seller");
      const viewer = await createMemberUser("get-ad-gate-member-pending-viewer");
      const ad = await createAd(seller.agent);

      const res = await viewer.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for a rejected ad to a member caller", async () => {
      const seller = await createMemberUser("get-ad-gate-member-rejected-seller");
      const viewer = await createMemberUser("get-ad-gate-member-rejected-viewer");
      const admin = await createAdminUser("get-ad-gate-member-rejected-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const res = await viewer.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(404);
    });

    it("returns 200 for a pending ad to its own advertiser", async () => {
      const seller = await createMemberUser("get-ad-gate-owner-pending-seller");
      const ad = await createAd(seller.agent);

      const res = await seller.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ad.id);
      expect(res.body.status).toBe("pending");
      // Public schema — admin-only fields must be absent
      expect(res.body).not.toHaveProperty("advertiserId");
      expect(res.body).not.toHaveProperty("parentAdId");
      expect(res.body).not.toHaveProperty("rejectionChain");
    });

    it("returns 200 for a rejected ad to its own advertiser", async () => {
      const seller = await createMemberUser("get-ad-gate-owner-rejected-seller");
      const admin = await createAdminUser("get-ad-gate-owner-rejected-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const res = await seller.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ad.id);
      expect(res.body.status).toBe("rejected");
      // Public schema — admin-only fields must be absent
      expect(res.body).not.toHaveProperty("advertiserId");
      expect(res.body).not.toHaveProperty("parentAdId");
      expect(res.body).not.toHaveProperty("rejectionChain");
    });

    it("returns 200 for a pending ad to an admin caller", async () => {
      const seller = await createMemberUser("get-ad-gate-admin-pending-seller");
      const admin = await createAdminUser("get-ad-gate-admin-pending-admin");
      const ad = await createAd(seller.agent);

      const res = await admin.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ad.id);
      expect(res.body.status).toBe("pending");
    });

    it("returns 200 for a rejected ad to an admin caller", async () => {
      const seller = await createMemberUser("get-ad-gate-admin-rejected-seller");
      const admin = await createAdminUser("get-ad-gate-admin-rejected-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const res = await admin.agent.get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ad.id);
      expect(res.body.status).toBe("rejected");
    });

    it("returns 200 for an active ad to an unauthenticated caller", async () => {
      const seller = await createMemberUser("get-ad-gate-anon-active-seller");
      const admin = await createAdminUser("get-ad-gate-anon-active-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get(`/api/ads/${ad.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ad.id);
    });
  });

  describe("GET /ads status visibility", () => {
    it("unauthenticated users do not see a freshly-created (pending) ad", async () => {
      const seller = await createMemberUser("ad-vis-anon-pending-seller");
      const ad = await createAd(seller.agent);

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).not.toContain(ad.id);
    });

    it("member users do not see a pending ad", async () => {
      const seller = await createMemberUser("ad-vis-member-pending-seller");
      const viewer = await createMemberUser("ad-vis-member-pending-viewer");
      const ad = await createAd(seller.agent);

      const res = await viewer.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).not.toContain(ad.id);
    });

    it("member users do not see a rejected ad", async () => {
      const seller = await createMemberUser("ad-vis-member-rejected-seller");
      const viewer = await createMemberUser("ad-vis-member-rejected-viewer");
      const admin = await createAdminUser("ad-vis-member-rejected-admin");
      const ad = await createAd(seller.agent);

      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const res = await viewer.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).not.toContain(ad.id);
    });

    it("admin sees a pending ad in the listing", async () => {
      const seller = await createMemberUser("ad-vis-admin-pending-seller");
      const admin = await createAdminUser("ad-vis-admin-pending-admin");
      const ad = await createAd(seller.agent);

      const res = await admin.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).toContain(ad.id);
    });

    it("admin sees a rejected ad in the listing", async () => {
      const seller = await createMemberUser("ad-vis-admin-rejected-seller");
      const admin = await createAdminUser("ad-vis-admin-rejected-admin");
      const ad = await createAd(seller.agent);

      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      const res = await admin.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).toContain(ad.id);
    });

    it("the advertiser does not see their own pending ad in GET /ads", async () => {
      const seller = await createMemberUser("ad-vis-owner-pending-seller");
      const ad = await createAd(seller.agent);

      // Seller calls the listing as themselves — their pending ad must be absent
      const res = await seller.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).not.toContain(ad.id);
    });

    it("the advertiser does not see their own rejected ad in GET /ads", async () => {
      const seller = await createMemberUser("ad-vis-owner-rejected-seller");
      const admin = await createAdminUser("ad-vis-owner-rejected-admin");
      const ad = await createAd(seller.agent);

      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "rejected" });

      // Seller calls the listing as themselves — their rejected ad must be absent
      const res = await seller.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).not.toContain(ad.id);
    });

    it("non-admin can see an active ad after admin approval", async () => {
      const seller = await createMemberUser("ad-vis-member-active-seller");
      const viewer = await createMemberUser("ad-vis-member-active-viewer");
      const admin = await createAdminUser("ad-vis-member-active-admin");
      const ad = await createAd(seller.agent);

      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const res = await viewer.agent.get("/api/ads");
      expect(res.status).toBe(200);
      const ids = (res.body as { id: number }[]).map((a) => a.id);
      expect(ids).toContain(ad.id);
    });
  });

  describe("GET /ads admin-only field visibility", () => {
    async function createAdWithParent(
      seller: Awaited<ReturnType<typeof createMemberUser>>,
      admin: Awaited<ReturnType<typeof createAdminUser>>,
      suffix: string,
    ) {
      const original = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });
      const resubmitRes = await seller.agent.post("/api/ads").send({
        title: `Resubmit ${suffix}`,
        content: "Resubmission content.",
        placement: "marketplace",
        replacesAdId: original.id,
      });
      expect(resubmitRes.status).toBe(201);
      return { original, resubmitted: resubmitRes.body as { id: number; parentAdId: number } };
    }

    it("does not expose parentAdId to unauthenticated users", async () => {
      const seller = await createMemberUser("ad-list-anon-seller");
      const admin = await createAdminUser("ad-list-anon-admin");
      await createAdWithParent(seller, admin, "anon");

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const ad of res.body as Record<string, unknown>[]) {
        expect(ad).not.toHaveProperty("parentAdId");
      }
    });

    it("does not expose parentAdId to member users", async () => {
      const seller = await createMemberUser("ad-list-member-seller");
      const viewer = await createMemberUser("ad-list-member-viewer");
      const admin = await createAdminUser("ad-list-member-admin");
      await createAdWithParent(seller, admin, "member");

      const res = await viewer.agent.get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const ad of res.body as Record<string, unknown>[]) {
        expect(ad).not.toHaveProperty("parentAdId");
      }
    });

    it("exposes parentAdId to admin users", async () => {
      const seller = await createMemberUser("ad-list-admin-seller");
      const admin = await createAdminUser("ad-list-admin-admin");
      const { resubmitted } = await createAdWithParent(seller, admin, "admin-view");

      const res = await admin.agent.get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = (res.body as Record<string, unknown>[]).find(
        (ad) => ad.id === resubmitted.id,
      );
      expect(found).toBeDefined();
      expect(found).toHaveProperty("parentAdId", resubmitted.parentAdId);
    });

    it("does not expose advertiserId to unauthenticated users", async () => {
      const seller = await createMemberUser("ad-list-anon-advertiserid-seller");
      const admin = await createAdminUser("ad-list-anon-advertiserid-admin");
      // Approve the ad so it appears in the public listing
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const { anonymousAgent } = await import("./helpers");
      const res = await anonymousAgent().get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const item of res.body as Record<string, unknown>[]) {
        expect(item).not.toHaveProperty("advertiserId");
      }
    });

    it("does not expose advertiserId to member users", async () => {
      const seller = await createMemberUser("ad-list-member-advertiserid-seller");
      const viewer = await createMemberUser("ad-list-member-advertiserid-viewer");
      const admin = await createAdminUser("ad-list-member-advertiserid-admin");
      const ad = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${ad.id}`).send({ status: "active" });

      const res = await viewer.agent.get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const item of res.body as Record<string, unknown>[]) {
        expect(item).not.toHaveProperty("advertiserId");
      }
    });

    it("exposes advertiserId to admin users", async () => {
      const seller = await createMemberUser("ad-list-admin-advertiserid-seller");
      const admin = await createAdminUser("ad-list-admin-advertiserid-admin");
      const ad = await createAd(seller.agent);

      const res = await admin.agent.get("/api/ads");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = (res.body as Record<string, unknown>[]).find((a) => a.id === ad.id);
      expect(found).toBeDefined();
      expect(found).toHaveProperty("advertiserId", seller.id);
    });
  });

  describe("resubmission limit", () => {
    it("allows a first resubmission after one rejection", async () => {
      const seller = await createMemberUser("ad-limit-first-seller");
      const admin = await createAdminUser("ad-limit-first-admin");
      const original = await createAd(seller.agent);

      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

      const res = await seller.agent.post("/api/ads").send({
        title: "First resubmit",
        content: "One rejection so far — should be allowed.",
        placement: "marketplace",
        replacesAdId: original.id,
      });

      expect(res.status).toBe(201);
    });

    it("blocks a second resubmission once the chain has two rejected ads", async () => {
      const seller = await createMemberUser("ad-limit-block-seller");
      const admin = await createAdminUser("ad-limit-block-admin");

      // Create and reject original ad
      const original = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

      // First resubmission — allowed (1 rejection in chain)
      const first = await seller.agent.post("/api/ads").send({
        title: "First resubmit",
        content: "After first rejection.",
        placement: "marketplace",
        replacesAdId: original.id,
      });
      expect(first.status).toBe(201);
      const firstId = (first.body as { id: number }).id;

      // Admin rejects the resubmission
      await admin.agent.patch(`/api/ads/${firstId}`).send({ status: "rejected" });

      // Second resubmission — should be blocked (2 rejections in chain)
      const second = await seller.agent.post("/api/ads").send({
        title: "Second resubmit",
        content: "After second rejection — limit reached.",
        placement: "marketplace",
        replacesAdId: firstId,
      });

      expect(second.status).toBe(403);
      expect(second.body.error).toMatch(/resubmission limit/i);
    });

    it("does not count non-rejected ancestors toward the limit", async () => {
      // A chain where the grandparent was approved (active) should not block
      // resubmission — only rejected entries count.
      const seller = await createMemberUser("ad-limit-active-ancestor-seller");
      const admin = await createAdminUser("ad-limit-active-ancestor-admin");

      // Create original, approve it
      const original = await createAd(seller.agent);
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "active" });

      // Admin reverts to pending so it can be re-moderated, then rejects
      await admin.agent.patch(`/api/ads/${original.id}`).send({ status: "rejected" });

      // Only one rejected ad in the chain — resubmission must be allowed
      const res = await seller.agent.post("/api/ads").send({
        title: "Resubmit after approved-then-rejected",
        content: "Ancestor was active, not a second rejection.",
        placement: "marketplace",
        replacesAdId: original.id,
      });

      expect(res.status).toBe(201);
    });
  });

  it("ignores advertiserId in the request body and always uses the session user", async () => {
    const realSeller = await createMemberUser("ad-inject-real");
    const victim = await createMemberUser("ad-inject-victim");

    // Attacker sends victim's ID as advertiserId in the body
    const res = await realSeller.agent.post("/api/ads").send({
      title: "Injected Ad",
      content: "Attempting to set advertiserId via body.",
      placement: "sidebar",
      advertiserId: victim.id,
    });

    expect(res.status).toBe(201);
    // The created ad must be owned by the session user, not the injected victim ID
    expect(res.body.advertiserId).toBe(realSeller.id);
    expect(res.body.advertiserId).not.toBe(victim.id);
  });
});
