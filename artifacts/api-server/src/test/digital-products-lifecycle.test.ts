import { describe, it, expect } from "vitest";
import { db, digitalProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createMemberUser, createAdminUser } from "./helpers";

async function createProduct(
  agent: Awaited<ReturnType<typeof createMemberUser>>["agent"],
) {
  const res = await agent.post("/api/digital-products").send({
    title: "Lifecycle Test Product",
    description: "Used for lifecycle testing.",
    priceCents: 1500,
    category: "ebook",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number; sellerId: number };
}

describe("digital-products purchase flow", () => {
  it("purchasing an active product returns 200 with confirmation", async () => {
    const seller = await createMemberUser("dp-lc-active-seller");
    const buyer = await createMemberUser("dp-lc-active-buyer");
    const product = await createProduct(seller.agent);

    const res = await buyer.agent.post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(200);
    expect(res.body.productId).toBe(product.id);
    expect(res.body.amountCents).toBe(1500);
    expect(res.body.message).toContain("Lifecycle Test Product");
  });

  it("purchasing an archived product returns 410", async () => {
    const seller = await createMemberUser("dp-lc-archived-seller");
    const buyer = await createMemberUser("dp-lc-archived-buyer");
    const product = await createProduct(seller.agent);

    // Archive the product (soft-delete via DELETE)
    const delRes = await seller.agent.delete(
      `/api/digital-products/${product.id}`,
    );
    expect(delRes.status).toBe(204);

    const res = await buyer.agent.post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(410);
  });

  it("purchasing requires authentication, returns 401 for anonymous users", async () => {
    const seller = await createMemberUser("dp-lc-purchase-unauth-seller");
    const product = await createProduct(seller.agent);

    const { anonymousAgent } = await import("./helpers");
    const res = await anonymousAgent().post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(401);
  });
});

describe("digital-products archive flow", () => {
  it("DELETE by owner sets status to 'archived' — product still exists in DB", async () => {
    const seller = await createMemberUser("dp-lc-soft-delete");
    const product = await createProduct(seller.agent);

    const res = await seller.agent.delete(
      `/api/digital-products/${product.id}`,
    );
    expect(res.status).toBe(204);

    const [row] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, product.id));

    expect(row).toBeDefined();
    expect(row.status).toBe("archived");
  });

  it("PATCH by owner can reactivate an archived product", async () => {
    const seller = await createMemberUser("dp-lc-reactivate");
    const product = await createProduct(seller.agent);

    // Archive it first
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Reactivate via PATCH
    const res = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("non-owner cannot archive (DELETE) someone else's product — returns 403", async () => {
    const seller = await createMemberUser("dp-lc-archive-owner");
    const stranger = await createMemberUser("dp-lc-archive-stranger");
    const product = await createProduct(seller.agent);

    const res = await stranger.agent.delete(
      `/api/digital-products/${product.id}`,
    );
    expect(res.status).toBe(403);

    // Product should still be active
    const [row] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, product.id));
    expect(row.status).toBe("active");
  });

  it("non-owner cannot reactivate (PATCH) someone else's archived product — returns 403", async () => {
    const seller = await createMemberUser("dp-lc-reactiv-owner");
    const stranger = await createMemberUser("dp-lc-reactiv-stranger");
    const product = await createProduct(seller.agent);

    // Owner archives the product
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Stranger tries to reactivate
    const res = await stranger.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });

    expect(res.status).toBe(403);

    // Product should remain archived
    const [row] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, product.id));
    expect(row.status).toBe("archived");
  });
});
