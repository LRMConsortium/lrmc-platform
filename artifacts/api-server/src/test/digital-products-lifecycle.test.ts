import { describe, it, expect, vi } from "vitest";
import { db, digitalProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createMemberUser, createAdminUser, anonymousAgent } from "./helpers";
import { getUncachableStripeClient } from "../lib/stripeClient";

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

describe("digital-products purchase visibility boundary", () => {
  it("a product with a non-active status injected directly cannot be purchased — returns 410", async () => {
    // This test guards the boundary between listing visibility and purchase access.
    // The GET /digital-products endpoint only returns active products by default.
    // The purchase endpoint must mirror that rule: only active products are purchasable.
    // We inject a product with a hypothetical future status ("suspended") directly into
    // the DB to confirm the handler rejects it regardless of how statuses evolve.
    const seller = await createMemberUser("dp-vis-suspended-seller");
    const buyer = await createMemberUser("dp-vis-suspended-buyer");
    const product = await createProduct(seller.agent);

    // Simulate a product that exists but is not visible to buyers (non-active, non-archived)
    await db
      .update(digitalProductsTable)
      .set({ status: "suspended" })
      .where(eq(digitalProductsTable.id, product.id));

    const res = await buyer.agent.post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(410);
  });

  it("only an active product can be purchased — archived returns 410", async () => {
    // Explicit mirror-of-listing check: archived products don't appear in the
    // default listing and must not be purchasable either.
    const seller = await createMemberUser("dp-vis-arch-seller");
    const buyer = await createMemberUser("dp-vis-arch-buyer");
    const product = await createProduct(seller.agent);

    await seller.agent.delete(`/api/digital-products/${product.id}`);

    const res = await buyer.agent.post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(410);
  });

  it("a product reactivated by an admin can be purchased again after being non-active", async () => {
    // Confirms the purchase gate correctly opens again once visibility is restored.
    const seller = await createMemberUser("dp-vis-reactivate-seller");
    const admin = await createAdminUser("dp-vis-reactivate-admin");
    const buyer = await createMemberUser("dp-vis-reactivate-buyer");
    const product = await createProduct(seller.agent);

    // Archive it
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Reactivate via PATCH -- only an admin can move status
    await admin.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });

    const res = await buyer.agent.post(
      `/api/digital-products/${product.id}/purchase`,
    );

    expect(res.status).toBe(200);
    expect(res.body.productId).toBe(product.id);
  });
});

describe("digital-products listing — archive status filtering", () => {
  it("default listing excludes archived products", async () => {
    const seller = await createMemberUser("dp-list-arch-excl-seller");
    const product = await createProduct(seller.agent);

    // Archive the product
    const delRes = await seller.agent.delete(`/api/digital-products/${product.id}`);
    expect(delRes.status).toBe(204);

    const res = await seller.agent.get("/api/digital-products");
    expect(res.status).toBe(200);
    const ids = (res.body as Array<{ id: number }>).map((p) => p.id);
    expect(ids).not.toContain(product.id);
  });

  it("?status=archived returns only archived products", async () => {
    const seller = await createMemberUser("dp-list-arch-filter-seller");
    const active = await createProduct(seller.agent);
    const toArchive = await createProduct(seller.agent);

    // Archive one product
    const delRes = await seller.agent.delete(`/api/digital-products/${toArchive.id}`);
    expect(delRes.status).toBe(204);

    const res = await seller.agent.get("/api/digital-products?status=archived");
    expect(res.status).toBe(200);
    const ids = (res.body as Array<{ id: number; status: string }>).map((p) => p.id);

    // Archived product appears
    expect(ids).toContain(toArchive.id);
    // Active product does not appear
    expect(ids).not.toContain(active.id);
    // Every returned item must be archived
    for (const item of res.body as Array<{ status: string }>) {
      expect(item.status).toBe("archived");
    }
  });

  it("product is excluded from the active listing immediately after being archived", async () => {
    const seller = await createMemberUser("dp-list-immediate-arch-seller");
    const product = await createProduct(seller.agent);

    // Confirm it appears in the active listing before archiving
    const beforeRes = await seller.agent.get("/api/digital-products");
    expect(beforeRes.status).toBe(200);
    const idsBefore = (beforeRes.body as Array<{ id: number }>).map((p) => p.id);
    expect(idsBefore).toContain(product.id);

    // Archive it
    const delRes = await seller.agent.delete(`/api/digital-products/${product.id}`);
    expect(delRes.status).toBe(204);

    // Confirm it no longer appears in the active listing
    const afterRes = await seller.agent.get("/api/digital-products");
    expect(afterRes.status).toBe(200);
    const idsAfter = (afterRes.body as Array<{ id: number }>).map((p) => p.id);
    expect(idsAfter).not.toContain(product.id);
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

  it("PATCH by owner cannot reactivate an archived product (admin-only); admin PATCH can", async () => {
    const seller = await createMemberUser("dp-lc-reactivate");
    const admin = await createAdminUser("dp-lc-reactivate-admin");
    const product = await createProduct(seller.agent);

    // Archive it first
    await seller.agent.delete(`/api/digital-products/${product.id}`);

    // Owner attempts to reactivate via PATCH -- status field is ignored
    const ownerRes = await seller.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.status).toBe("archived");

    // Admin reactivates via PATCH
    const adminRes = await admin.agent
      .patch(`/api/digital-products/${product.id}`)
      .send({ status: "active" });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.status).toBe("active");
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

describe("digital-products checkout — missing Stripe price ID guard", () => {
  it("POST /checkout returns 409 when the product's stripePriceId is null", async () => {
    // Guard: a product can exist without a valid Stripe price ID (e.g. if the
    // Stripe catalog call failed after the DB row was written, or a migration
    // left the field null). The checkout endpoint must reject such products
    // with 409 rather than forwarding a null price ID to Stripe.
    const seller = await createMemberUser("dp-co-noprice-seller");
    const product = await createProduct(seller.agent);

    // Null out the Stripe price ID directly in the DB to simulate the broken state.
    await db
      .update(digitalProductsTable)
      .set({ stripePriceId: null })
      .where(eq(digitalProductsTable.id, product.id));

    // The checkout endpoint is intentionally public (guests can buy).
    const res = await anonymousAgent()
      .post(`/api/digital-products/${product.id}/checkout`)
      .send({ buyerEmail: "buyer@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ready for purchase/i);
  });
});

describe("digital-products checkout — failed DB insert expires Stripe session", () => {
  it("expires the Stripe session and returns 500 when the purchase record insert fails", async () => {
    // Safety guard test: after Stripe creates a checkout session, the handler
    // tries to insert a purchase row so the webhook has a fulfillment target.
    // If that insert fails the handler must immediately expire the Stripe
    // session so the buyer cannot complete a payment with no fulfillment path.
    const seller = await createMemberUser("dp-co-expire-seller");
    const product = await createProduct(seller.agent);

    const mockSessionId = "cs_test_expire_guard_xyz";
    const expireSpy = vi.fn().mockResolvedValue({});

    // Override the default stub with a stripe client whose session.create
    // returns a known session ID, and whose expire method is a spy we can assert on.
    vi.mocked(getUncachableStripeClient).mockResolvedValueOnce({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: mockSessionId,
            url: "https://checkout.stripe.com/test/expire-guard",
          }),
          expire: expireSpy,
        },
      },
    } as never);

    // Force the DB insert to throw after Stripe has already created the session.
    // db.insert(table) returns a query builder; mock its .values() to reject.
    const insertSpy = vi.spyOn(db, "insert").mockImplementationOnce(
      () =>
        ({
          values: vi.fn().mockRejectedValueOnce(new Error("DB insert failed")),
        }) as never,
    );

    try {
      const res = await anonymousAgent()
        .post(`/api/digital-products/${product.id}/checkout`)
        .send({ buyerEmail: "buyer@example.com" });

      // The handler re-throws after expiring the session, so the caller gets 500.
      expect(res.status).toBe(500);
      // The Stripe session must have been expired with the session ID that was
      // returned by stripe.checkout.sessions.create -- the critical safety invariant.
      expect(expireSpy).toHaveBeenCalledWith(mockSessionId);
    } finally {
      insertSpy.mockRestore();
    }
  });
});
