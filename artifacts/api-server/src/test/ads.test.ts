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
