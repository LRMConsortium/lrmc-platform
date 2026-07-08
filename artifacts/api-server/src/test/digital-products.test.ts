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

describe("digital-products mid-session archive", () => {
  it("returns 410 when a buyer attempts to purchase a product archived mid-session", async () => {
    const seller = await createMemberUser("dp-midsession-seller");
    const buyer = await createMemberUser("dp-midsession-buyer");

    // Seller creates an active product
    const product = await createDigitalProduct(seller.agent);

    // Seller archives the product (simulating mid-session disappearance)
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Buyer attempts to purchase the now-archived product
    const res = await buyer.agent.post(`/api/digital-products/${product.id}/purchase`);
    expect(res.status).toBe(410);
  });

  it("does not include archived products in the default (active) listing", async () => {
    const seller = await createMemberUser("dp-midsession-listing-seller");
    const buyer = await createMemberUser("dp-midsession-listing-buyer");

    // Seller creates and then archives a product
    const product = await createDigitalProduct(seller.agent);
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Default listing (no status param) should not include the archived product
    const res = await buyer.agent.get("/api/digital-products");
    expect(res.status).toBe(200);
    expect(res.body).not.toContainEqual(expect.objectContaining({ id: product.id }));
  });
});

describe("digital-products archived filter authorization", () => {
  it("rejects an anonymous request for ?status=archived with 401", async () => {
    const res = await anonymousAgent().get("/api/digital-products?status=archived");
    expect(res.status).toBe(401);
  });

  it("rejects a regular member requesting ?status=archived for another seller's products with an empty list", async () => {
    // A seller archives their product, a stranger cannot see it via the archived filter
    const seller = await createMemberUser("dp-arch-seller");
    const stranger = await createMemberUser("dp-arch-stranger");

    // Create and archive a product
    const product = await createDigitalProduct(seller.agent);
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Stranger's archived list should be empty (scoped to their own sellerId)
    const res = await stranger.agent.get("/api/digital-products?status=archived");
    expect(res.status).toBe(200);
    expect(res.body).not.toContainEqual(expect.objectContaining({ id: product.id }));
  });

  it("allows a seller to see their own archived products", async () => {
    const seller = await createMemberUser("dp-arch-self");
    const product = await createDigitalProduct(seller.agent);
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    const res = await seller.agent.get("/api/digital-products?status=archived");
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual(expect.objectContaining({ id: product.id }));
  });

  it("allows an admin to see all archived products", async () => {
    const seller = await createMemberUser("dp-arch-admin-seller");
    const admin = await createAdminUser("dp-arch-admin");
    const product = await createDigitalProduct(seller.agent);
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    const res = await admin.agent.get("/api/digital-products?status=archived");
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual(expect.objectContaining({ id: product.id }));
  });
});

describe("digital-products purchase authorization", () => {
  it("returns 404 when a buyer attempts to purchase a product ID that does not exist", async () => {
    const buyer = await createMemberUser("dp-purchase-nonexistent-buyer");

    // Use a product ID that is astronomically unlikely to exist
    const res = await buyer.agent.post("/api/digital-products/999999999/purchase");
    expect(res.status).toBe(404);
  });

  it("returns 401 when an unauthenticated user attempts to purchase any product", async () => {
    const seller = await createMemberUser("dp-purchase-unauth-seller");
    const product = await createDigitalProduct(seller.agent);

    const res = await anonymousAgent().post(`/api/digital-products/${product.id}/purchase`);
    expect(res.status).toBe(401);
  });

  it("returns a clear error when a buyer purchases a product that was never publicly available to them", async () => {
    const seller = await createMemberUser("dp-purchase-never-active-seller");
    const buyer = await createMemberUser("dp-purchase-never-active-buyer");

    // Seller creates a product and immediately archives it — it was never visible
    // in the public active listing so the buyer never had legitimate access to it.
    const product = await createDigitalProduct(seller.agent);
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Buyer guesses the product ID (never saw it in a listing) and attempts purchase.
    const res = await buyer.agent.post(`/api/digital-products/${product.id}/purchase`);
    expect(res.status).toBe(410);
    expect(res.body).toHaveProperty("error");
  });
});

describe("digital-products status validation", () => {
  it("rejects PATCH with an invalid status value with 400", async () => {
    const seller = await createMemberUser("dp-invalid-status-seller");
    const product = await createDigitalProduct(seller.agent);

    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "suspended" });

    expect(res.status).toBe(400);
  });

  it("accepts PATCH with a valid status value 'archived'", async () => {
    const seller = await createMemberUser("dp-valid-status-seller");
    const product = await createDigitalProduct(seller.agent);

    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "archived" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("archived");
  });

  it("accepts PATCH with a valid status value 'active'", async () => {
    const seller = await createMemberUser("dp-valid-status-active-seller");
    const product = await createDigitalProduct(seller.agent);

    // Archive first, then re-activate
    await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "archived" });

    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });
});

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
