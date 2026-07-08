import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser } from "./helpers";

async function createListing(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/property-listings").send({
    category: "property",
    title: "Authz Test Listing",
    location: "Fajara",
    priceCents: 100000,
    status: "active",
  });
  expect(res.status).toBe(201);
  return res.body.id as number;
}

describe("property-listings authorization", () => {
  it("rejects a non-owner PATCH with 403", async () => {
    const owner = await createMemberUser("owner");
    const stranger = await createMemberUser("stranger");
    const listingId = await createListing(owner.agent);

    const res = await stranger.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows the owner to PATCH their own listing", async () => {
    const owner = await createMemberUser("owner");
    const listingId = await createListing(owner.agent);

    const res = await owner.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ title: "Updated by owner" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated by owner");
  });

  it("allows an admin to PATCH someone else's listing", async () => {
    const owner = await createMemberUser("owner");
    const admin = await createAdminUser("admin");
    const listingId = await createListing(owner.agent);

    const res = await admin.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ title: "Updated by admin" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated by admin");
  });

  it("rejects a non-owner DELETE with 403", async () => {
    const owner = await createMemberUser("owner");
    const stranger = await createMemberUser("stranger");
    const listingId = await createListing(owner.agent);

    const res = await stranger.agent.delete(`/api/property-listings/${listingId}`);

    expect(res.status).toBe(403);
  });

  it("allows the owner to DELETE their own listing", async () => {
    const owner = await createMemberUser("owner");
    const listingId = await createListing(owner.agent);

    const res = await owner.agent.delete(`/api/property-listings/${listingId}`);

    expect(res.status).toBe(204);
  });

  it("allows an admin to DELETE someone else's listing", async () => {
    const owner = await createMemberUser("owner");
    const admin = await createAdminUser("admin");
    const listingId = await createListing(owner.agent);

    const res = await admin.agent.delete(`/api/property-listings/${listingId}`);

    expect(res.status).toBe(204);
  });
});

describe("property-listings zero-price validation", () => {
  it("rejects priceCents: 0 on creation with 400", async () => {
    const owner = await createMemberUser("owner-zero");
    const res = await owner.agent.post("/api/property-listings").send({
      category: "property",
      title: "Zero Price Listing",
      location: "Fajara",
      priceCents: 0,
    });
    expect(res.status).toBe(400);
  });

  it("accepts priceCents: 1 on creation", async () => {
    const owner = await createMemberUser("owner-one-cent");
    const res = await owner.agent.post("/api/property-listings").send({
      category: "property",
      title: "One Cent Listing",
      location: "Fajara",
      priceCents: 1,
    });
    expect(res.status).toBe(201);
  });
});

describe("property-listings status validation", () => {
  it("rejects an invalid status value with 400", async () => {
    const owner = await createMemberUser("owner");
    const listingId = await createListing(owner.agent);

    const res = await owner.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid status value (rented)", async () => {
    const owner = await createMemberUser("owner");
    const listingId = await createListing(owner.agent);

    const res = await owner.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ status: "rented" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rented");
  });

  it("accepts a valid status value (inactive)", async () => {
    const owner = await createMemberUser("owner");
    const listingId = await createListing(owner.agent);

    const res = await owner.agent
      .patch(`/api/property-listings/${listingId}`)
      .send({ status: "inactive" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("inactive");
  });
});
