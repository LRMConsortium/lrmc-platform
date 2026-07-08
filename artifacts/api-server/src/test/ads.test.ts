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
