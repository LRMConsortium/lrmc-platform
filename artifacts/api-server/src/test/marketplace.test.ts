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

  it("accepts a valid status value", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/marketplace-listings/${listingId}`)
      .send({ status: "sold" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sold");
  });
});
