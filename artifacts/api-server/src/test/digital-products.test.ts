import { describe, it, expect } from "vitest";
import { createMemberUser, createAdminUser, anonymousAgent } from "./helpers";

async function createDigitalProduct(agent: Awaited<ReturnType<typeof createMemberUser>>["agent"]) {
  const res = await agent.post("/api/digital-products").send({
    title: "Authz Test Digital Product",
    description: "Used for authorization testing.",
    priceCents: 999,
    category: "ebook",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number; sellerId: number };
}

describe("digital-products authorization", () => {
  it("sets sellerId from the authenticated session on create", async () => {
    const seller = await createMemberUser("dp-creator");
    const product = await createDigitalProduct(seller.agent);

    expect(product.sellerId).toBe(seller.id);
  });

  it("rejects an unauthenticated PATCH with 401", async () => {
    const seller = await createMemberUser("dp-unauth-patch");
    const product = await createDigitalProduct(seller.agent);

    const res = await anonymousAgent()
      .patch(`/api/digital-products/${product.id}`)
      .send({ title: "No auth" });

    expect(res.status).toBe(401);
  });

  it("rejects a non-owner PATCH with 403", async () => {
    const seller = await createMemberUser("dp-owner");
    const stranger = await createMemberUser("dp-stranger");
    const product = await createDigitalProduct(seller.agent);

    const res = await stranger.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("allows the creator to PATCH their own product", async () => {
    const seller = await createMemberUser("dp-self-edit");
    const product = await createDigitalProduct(seller.agent);

    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ title: "My revised title" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("My revised title");
  });

  it("allows an admin to PATCH any product", async () => {
    const seller = await createMemberUser("dp-admin-edit-seller");
    const admin = await createAdminUser("dp-admin-edit-admin");
    const product = await createDigitalProduct(seller.agent);

    const res = await admin.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ title: "Admin override" });

    expect(res.status).toBe(200);
  });

  it("rejects a non-owner DELETE with 403", async () => {
    const seller = await createMemberUser("dp-delete-owner");
    const stranger = await createMemberUser("dp-delete-stranger");
    const product = await createDigitalProduct(seller.agent);

    const res = await stranger.agent.delete(`/api/digital-products/${product.id}`);
    expect(res.status).toBe(403);
  });

  it("allows the creator to DELETE their own product", async () => {
    const seller = await createMemberUser("dp-delete-self");
    const product = await createDigitalProduct(seller.agent);

    const res = await seller.agent.delete(`/api/digital-products/${product.id}`);
    expect(res.status).toBe(204);
  });

  it("allows an admin to DELETE any product", async () => {
    const seller = await createMemberUser("dp-admin-delete-seller");
    const admin = await createAdminUser("dp-admin-delete-admin");
    const product = await createDigitalProduct(seller.agent);

    const res = await admin.agent.delete(`/api/digital-products/${product.id}`);
    expect(res.status).toBe(204);
  });
});
