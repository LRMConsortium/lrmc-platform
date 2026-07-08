import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createLandListing(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/land-listings").send({
    title: "Authz Test Plot",
    location: "Brikama",
    priceCents: 200000,
    sizeAcres: 1,
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("land-listings authorization", () => {
  it("rejects a non-seller PATCH with 403", async () => {
    const seller = await createMemberUser("seller");
    const stranger = await createMemberUser("stranger");
    const listingId = await createLandListing(seller.agent);

    const res = await stranger.agent
      .patch(`/api/land-listings/${listingId}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows the seller to PATCH their own listing", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createLandListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/land-listings/${listingId}`)
      .send({ title: "Updated by seller" });

    expect(res.status).toBe(200);
  });

  it("allows an admin to PATCH someone else's listing", async () => {
    const seller = await createMemberUser("seller");
    const admin = await createAdminUser("admin");
    const listingId = await createLandListing(seller.agent);

    const res = await admin.agent
      .patch(`/api/land-listings/${listingId}`)
      .send({ title: "Updated by admin" });

    expect(res.status).toBe(200);
  });

  it("rejects an invalid status value with 400", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createLandListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/land-listings/${listingId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid status value", async () => {
    const seller = await createMemberUser("seller");
    const listingId = await createLandListing(seller.agent);

    const res = await seller.agent
      .patch(`/api/land-listings/${listingId}`)
      .send({ status: "sold" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sold");
  });
});

describe("land-listings zero-price validation", () => {
  it("rejects priceCents: 0 on creation with 400", async () => {
    const seller = await createMemberUser("seller-zero");
    const res = await seller.agent.post("/api/land-listings").send({
      title: "Zero Price Plot",
      location: "Brikama",
      priceCents: 0,
      sizeAcres: 1,
    });
    expect(res.status).toBe(400);
  });

  it("accepts priceCents: 1 on creation", async () => {
    const seller = await createMemberUser("seller-one-cent");
    const res = await seller.agent.post("/api/land-listings").send({
      title: "One Cent Plot",
      location: "Brikama",
      priceCents: 1,
      sizeAcres: 1,
    });
    expect(res.status).toBe(201);
  });
});

describe("land-transactions scoping", () => {
  it("only returns transactions where the caller is buyer or seller, not other users' transactions", async () => {
    const seller = await createMemberUser("seller");
    const buyer = await createMemberUser("buyer");
    const outsider = await createMemberUser("outsider");
    const listingId = await createLandListing(seller.agent);

    const purchaseRes = await buyer.agent
      .post("/api/land-transactions")
      .send({ listingId });
    expect(purchaseRes.status).toBe(201);
    const transactionId = purchaseRes.body.id as number;

    const outsiderList = await outsider.agent.get("/api/land-transactions");
    expect(outsiderList.status).toBe(200);
    expect(
      (outsiderList.body as Array<{ id: number }>).some((t) => t.id === transactionId),
    ).toBe(false);

    const buyerList = await buyer.agent.get("/api/land-transactions");
    expect(buyerList.status).toBe(200);
    expect((buyerList.body as Array<{ id: number }>).some((t) => t.id === transactionId)).toBe(
      true,
    );

    const sellerList = await seller.agent.get("/api/land-transactions");
    expect(sellerList.status).toBe(200);
    expect((sellerList.body as Array<{ id: number }>).some((t) => t.id === transactionId)).toBe(
      true,
    );
  });

  it("lets an admin see transactions belonging to other users", async () => {
    const seller = await createMemberUser("seller");
    const buyer = await createMemberUser("buyer");
    const admin = await createAdminUser("admin");
    const listingId = await createLandListing(seller.agent);

    const purchaseRes = await buyer.agent
      .post("/api/land-transactions")
      .send({ listingId });
    expect(purchaseRes.status).toBe(201);
    const transactionId = purchaseRes.body.id as number;

    const adminList = await admin.agent.get("/api/land-transactions");
    expect(adminList.status).toBe(200);
    expect((adminList.body as Array<{ id: number }>).some((t) => t.id === transactionId)).toBe(
      true,
    );
  });
});
