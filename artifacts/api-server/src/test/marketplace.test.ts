import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createListing(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/marketplace-listings").send({
    title: "Authz Test Product",
    description: "A test product used to exercise authorization checks.",
    priceCents: 15000,
    category: "misc",
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

async function createDigitalProduct(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/digital-products").send({
    title: "Authz Test Digital Product",
    description: "A test digital product used to exercise authorization checks.",
    priceCents: 5000,
    category: "misc",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number; sellerId: number };
}

describe("marketplace-listings authorization", () => {
  it("rejects a non-seller PATCH with 403", async () => {
    const seller = await createMemberUser("seller");
    const stranger = await createMemberUser("stranger");
    const listingId = await createListing(seller.agent);

    const res = await stranger.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows the seller to PATCH their own listing", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ title: "Updated by seller" });

    expect(res.status).toBe(200);
  });

  it("allows an admin to PATCH someone else's listing", async () => {
    const seller = await createMemberUser("seller");
    const admin = await createAdminUser("admin");
    const listingId = await createListing(seller.agent);

    const res = await admin.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ title: "Updated by admin" });

    expect(res.status).toBe(200);
  });

  it("rejects a non-seller DELETE with 403", async () => {
    const seller = await createMemberUser("seller");
    const stranger = await createMemberUser("stranger");
    const listingId = await createListing(seller.agent);

    const res = await stranger.agent.delete(`/api/marketplace-listings/${listingId}`);

    expect(res.status).toBe(403);
  });

  it("allows the seller to DELETE their own listing", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createListing(seller.agent);

    const res = await seller.agent.delete(`/api/marketplace-listings/${listingId}`);

    expect(res.status).toBe(204);
  });

  it("rejects an invalid status value with 400", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("does not let the owner change status directly (admin-only)", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ status: "sold" });

    // Request is well-formed (valid enum value) so it's accepted, but the
    // status field is silently ignored for non-admins -- only an admin can
    // move a listing through the sold/active/inactive state machine.
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("lets an admin change a listing's status", async () => {
    const seller = await createMemberUser("seller-status-admin");
    const admin = await createAdminUser("admin-status");
    const listingId = await createListing(seller.agent);

    const res = await admin.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ status: "sold" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sold");
  });

  it("does not let an admin reassign a marketplace listing's seller via PATCH", async () => {
    const seller = await createMemberUser("mlseller");
    const otherUser = await createMemberUser("mlother");
    const admin = await createAdminUser("mladmin");
    const listingId = await createListing(seller.agent);

    const res = await admin.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ title: "Updated by admin", sellerId: otherUser.id });

    expect(res.status).toBe(200);
    expect(res.body.sellerId).toBe(seller.id);
    expect(res.body.sellerId).not.toBe(otherUser.id);
  });

  it("does not let an admin reassign a digital product's seller via PATCH", async () => {
    const seller = await createMemberUser("dpseller");
    const otherUser = await createMemberUser("dpother");
    const admin = await createAdminUser("dpadmin");
    const product = await createDigitalProduct(seller.agent);

    const res = await admin.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ title: "Updated by admin", sellerId: otherUser.id });

    expect(res.status).toBe(200);
    expect(res.body.sellerId).toBe(product.sellerId);
    expect(res.body.sellerId).not.toBe(otherUser.id);
  });
});
