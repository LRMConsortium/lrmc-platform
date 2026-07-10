import { Router, type IRouter } from "express";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  db,
  marketplaceListingsTable,
  digitalProductsTable,
  digitalProductPurchasesTable,
  adsTable,
} from "@workspace/db";
import {
  ListMarketplaceListingsResponse,
  CreateMarketplaceListingBody,
  CreateMarketplaceListingResponse,
  UpdateMarketplaceListingParams,
  UpdateMarketplaceListingBody,
  UpdateMarketplaceListingResponse,
  DeleteMarketplaceListingParams,
  ListDigitalProductsQueryParams,
  ListDigitalProductsResponse,
  CreateDigitalProductBody,
  CreateDigitalProductResponse,
  UpdateDigitalProductParams,
  UpdateDigitalProductBody,
  UpdateDigitalProductResponse,
  DeleteDigitalProductParams,
  CheckoutDigitalProductParams,
  CheckoutDigitalProductBody,
  CheckoutDigitalProductResponse,
  PurchaseDigitalProductParams,
  PurchaseDigitalProductResponse,
  ListAdsResponse,
  ListAdsResponseItem,
  CreateAdBody,
  CreateAdResponse,
  GetAdParams,
  GetAdResponse,
  UpdateAdParams,
  UpdateAdBody,
  UpdateAdResponse,
  DeleteAdParams,
} from "@workspace/api-zod";
import {
  createDigitalProductStripeCatalog,
  getOrCreateMemberDiscountCoupon,
  updateDigitalProductStripeMetadata,
  updateDigitalProductStripePrice,
} from "../lib/digitalProductStripeSync";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { getWebBaseUrl } from "../lib/urls";

// Public ad schemas: strip admin-only moderation fields from non-admin responses.
// Add new admin-only fields here so they are never accidentally leaked.
const ListAdsPublicResponseItem = ListAdsResponseItem.omit({ parentAdId: true, advertiserId: true, rejectionNote: true });
const ListAdsPublicResponse = ListAdsPublicResponseItem.array();
// Single-ad public schema: omit parentAdId, advertiserId, and rejectionChain so
// non-admins cannot traverse the moderation chain or enumerate user IDs.
const GetAdPublicResponse = GetAdResponse.omit({ parentAdId: true, rejectionChain: true, advertiserId: true });
import { requireAuth, requireApprovedMembership } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

// Hard cap on how many ancestors we'll walk when computing a rejection chain
// or resubmission count. Prevents an attacker (or a misconfigured
// AD_RESUBMISSION_LIMIT) from turning a single request into hundreds of
// sequential DB round-trips.
const MAX_ANCESTOR_CHAIN_DEPTH = 25;

const MAX_LISTING_PAGE_SIZE = 100;

router.get("/marketplace-listings", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.status, "active"))
    .orderBy(desc(marketplaceListingsTable.createdAt))
    .limit(MAX_LISTING_PAGE_SIZE);
  res.json(ListMarketplaceListingsResponse.parse(rows));
});

router.post(
  "/marketplace-listings",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const parsed = CreateMarketplaceListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [listing] = await db
      .insert(marketplaceListingsTable)
      .values({ ...parsed.data, sellerId: req.session.userId! })
      .returning();

    res.status(201).json(CreateMarketplaceListingResponse.parse(listing));
  },
);

router.patch(
  "/marketplace-listings/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = UpdateMarketplaceListingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateMarketplaceListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Marketplace listing not found" });
      return;
    }

    if (!isOwnerOrAdmin(req, existing.sellerId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const isAdmin = req.session.role === "admin";
    // Only admins may change the status state machine (e.g. marking a listing
    // "sold" or reactivating it). Owners can only edit content fields --
    // otherwise a seller could fraudulently mark a listing "sold" without a
    // real sale, or flip a sold listing back to "active" to evade tracking.
    const { status: _status, ...contentFields } = parsed.data;
    const update = isAdmin ? parsed.data : contentFields;

    if (Object.keys(update).length === 0) {
      // Owner sent only a status change, which is admin-only -- nothing left
      // to apply. Return the listing unchanged rather than issuing an empty
      // (and invalid) SQL update.
      res.json(UpdateMarketplaceListingResponse.parse(existing));
      return;
    }

    const [listing] = await db
      .update(marketplaceListingsTable)
      .set(update)
      .where(eq(marketplaceListingsTable.id, params.data.id))
      .returning();

    res.json(UpdateMarketplaceListingResponse.parse(listing));
  },
);

router.delete(
  "/marketplace-listings/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = DeleteMarketplaceListingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Marketplace listing not found" });
      return;
    }

    if (!isOwnerOrAdmin(req, existing.sellerId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .delete(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));

    res.sendStatus(204);
  },
);

const MAX_PRODUCT_PAGE_SIZE = 100;

router.get("/digital-products", async (req, res): Promise<void> => {
  const query = ListDigitalProductsQueryParams.safeParse(req.query);
  // If the caller sent a status value that fails validation (i.e. anything
  // outside the ['active', 'archived'] enum), reject the request instead of
  // silently falling back to "active" -- falling back would let a malformed
  // query slip through as if it were valid input.
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const statusFilter = query.data.status ?? "active";

  if (statusFilter === "archived") {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const isAdmin = req.session.role === "admin";

    const rows = await db
      .select()
      .from(digitalProductsTable)
      .where(
        isAdmin
          ? eq(digitalProductsTable.status, "archived")
          : and(
              eq(digitalProductsTable.status, "archived"),
              eq(digitalProductsTable.sellerId, req.session.userId),
            ),
      )
      .orderBy(desc(digitalProductsTable.createdAt))
      .limit(MAX_PRODUCT_PAGE_SIZE);
    res.json(ListDigitalProductsResponse.parse(rows));
    return;
  }

  const rows = await db
    .select()
    .from(digitalProductsTable)
    .where(eq(digitalProductsTable.status, statusFilter))
    .orderBy(desc(digitalProductsTable.createdAt))
    .limit(MAX_PRODUCT_PAGE_SIZE);
  res.json(ListDigitalProductsResponse.parse(rows));
});

router.post(
  "/digital-products",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const parsed = CreateDigitalProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Create the real Stripe catalog objects first so we never persist a
    // product that can't actually be checked out.
    const { stripeProductId, stripePriceId } = await createDigitalProductStripeCatalog({
      title: parsed.data.title,
      description: parsed.data.description,
      priceCents: parsed.data.priceCents,
    });

    const [product] = await db
      .insert(digitalProductsTable)
      .values({
        ...parsed.data,
        sellerId: req.session.userId!,
        stripeProductId,
        stripePriceId,
      })
      .returning();

    res.status(201).json(CreateDigitalProductResponse.parse(product));
  },
);

router.patch(
  "/digital-products/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = UpdateDigitalProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateDigitalProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const result = await db.transaction(async (tx) => {
      // Lock the product row so this update can't interleave with a
      // concurrent purchase's read-then-charge sequence.
      const [existing] = await tx
        .select()
        .from(digitalProductsTable)
        .where(eq(digitalProductsTable.id, params.data.id))
        .for("update");

      if (!existing) {
        return { status: 404 as const, body: { error: "Digital product not found" } };
      }

      if (!isOwnerOrAdmin(req, existing.sellerId)) {
        return { status: 403 as const, body: { error: "Forbidden" } };
      }

      const isAdmin = req.session.role === "admin";
      // Only admins may change status. Otherwise an owner could use DELETE
      // (soft-archive) followed by PATCH { status: "active" } to reactivate
      // their own product without any admin involvement.
      const { status: _status, ...contentOnly } = parsed.data;
      const effectiveData = isAdmin ? parsed.data : contentOnly;

      let stripePriceId = existing.stripePriceId;
      if (
        parsed.data.priceCents !== undefined &&
        parsed.data.priceCents !== existing.priceCents &&
        existing.stripeProductId
      ) {
        const updated = await updateDigitalProductStripePrice(
          existing.stripeProductId,
          existing.stripePriceId,
          parsed.data.priceCents,
        );
        stripePriceId = updated.stripePriceId;
      }

      if ((parsed.data.title || parsed.data.description) && existing.stripeProductId) {
        await updateDigitalProductStripeMetadata(existing.stripeProductId, {
          title: parsed.data.title,
          description: parsed.data.description,
        });
      }

      const [product] = await tx
        .update(digitalProductsTable)
        .set({ ...effectiveData, stripePriceId })
        .where(eq(digitalProductsTable.id, params.data.id))
        .returning();

      return {
        status: 200 as const,
        body: UpdateDigitalProductResponse.parse(product),
      };
    });

    res.status(result.status).json(result.body);
  },
);

router.delete(
  "/digital-products/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = DeleteDigitalProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Digital product not found" });
      return;
    }

    if (!isOwnerOrAdmin(req, existing.sellerId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .update(digitalProductsTable)
      .set({ status: "archived" })
      .where(eq(digitalProductsTable.id, params.data.id));

    res.sendStatus(204);
  },
);

router.post(
  "/digital-products/:id/checkout",
  // Intentionally public: guests (no account) must be able to buy digital
  // products, not just members. Members get a discount below via session.
  async (req, res): Promise<void> => {
    const params = CheckoutDigitalProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CheckoutDigitalProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [product] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, params.data.id));

    // Only "active" products are visible to buyers in the default listing.
    // Treat "not found" and "exists but not active" identically (both 404)
    // so this public endpoint can't be used to probe which product IDs
    // exist by comparing status codes.
    if (!product || product.status !== "active") {
      res.status(404).json({ error: "Digital product not found" });
      return;
    }

    if (!product.stripePriceId) {
      res.status(409).json({ error: "This product isn't ready for purchase yet" });
      return;
    }

    // Prevent duplicate purchases: if this buyer (by email, or by account for
    // logged-in members) already has a paid purchase for this product, don't
    // let them buy it again. We also block starting a second checkout while
    // one is already pending, so a buyer can't flood Stripe with duplicate
    // open sessions for the same product.
    const buyerId = req.session.userId ?? null;
    const existingPurchases = await db
      .select()
      .from(digitalProductPurchasesTable)
      .where(
        and(
          eq(digitalProductPurchasesTable.productId, product.id),
          buyerId !== null
            ? eq(digitalProductPurchasesTable.buyerId, buyerId)
            : eq(digitalProductPurchasesTable.buyerEmail, parsed.data.buyerEmail),
        ),
      );

    if (existingPurchases.some((p) => p.status === "paid")) {
      res.status(409).json({ error: "You already own this product" });
      return;
    }
    if (existingPurchases.some((p) => p.status === "pending")) {
      res.status(409).json({ error: "A checkout for this product is already in progress" });
      return;
    }

    const isMember = !!req.session.userId;
    const stripe = await getUncachableStripeClient();
    const baseUrl = getWebBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: parsed.data.buyerEmail,
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      discounts: isMember
        ? [{ coupon: await getOrCreateMemberDiscountCoupon() }]
        : undefined,
      success_url: `${baseUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/store/cancel`,
      metadata: {
        digitalProductId: String(product.id),
        buyerEmail: parsed.data.buyerEmail,
      },
    });

    try {
      await db.insert(digitalProductPurchasesTable).values({
        productId: product.id,
        buyerId: req.session.userId ?? null,
        buyerEmail: parsed.data.buyerEmail,
        amountCents: product.priceCents,
        memberDiscountApplied: isMember,
        stripeCheckoutSessionId: session.id,
        status: "pending",
      });
    } catch (err) {
      // The order record failed to persist -- if the buyer paid anyway, the
      // webhook would have no purchase row to fulfill against. Expire the
      // session so the checkout link can't be used, rather than leaving a
      // charge with no fulfillment path.
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      throw err;
    }

    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL" });
      return;
    }

    res.json(CheckoutDigitalProductResponse.parse({ checkoutUrl: session.url }));
  },
);

// Legacy member-only purchase confirmation (no real payment) -- distinct from
// POST /digital-products/:id/checkout above, which creates a real Stripe
// Checkout session and is open to guests.
router.post(
  "/digital-products/:id/purchase",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = PurchaseDigitalProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const result = await db.transaction(async (tx) => {
      // Lock the product row for the duration of the transaction so a
      // concurrent PATCH updating priceCents must wait until this purchase
      // commits (or is rolled back), preventing a price change from being
      // applied between our read and the purchase being finalized.
      const [product] = await tx
        .select()
        .from(digitalProductsTable)
        .where(eq(digitalProductsTable.id, params.data.id))
        .for("update");

      if (!product) {
        return { status: 404 as const, body: { error: "Digital product not found" } };
      }

      // Only "active" products are visible to buyers in the default listing.
      // Reject purchase of any non-active product so the purchase gate always
      // mirrors the visibility rules -- regardless of how many statuses are
      // added in the future.
      if (product.status !== "active") {
        return {
          status: 410 as const,
          body: { error: "This product is no longer available" },
        };
      }

      return {
        status: 200 as const,
        body: PurchaseDigitalProductResponse.parse({
          productId: product.id,
          amountCents: product.priceCents,
          message: `Purchase of "${product.title}" confirmed.`,
        }),
      };
    });

    res.status(result.status).json(result.body);
  },
);

const MAX_ADS_PAGE_SIZE = 100;

router.get("/ads", async (req, res): Promise<void> => {
  const isAdmin = req.session?.role === "admin";
  if (isAdmin) {
    const rows = await db
      .select()
      .from(adsTable)
      .orderBy(desc(adsTable.createdAt))
      .limit(MAX_ADS_PAGE_SIZE);
    res.json(ListAdsResponse.parse(rows));
  } else {
    // Non-admins only see approved ads — pending and rejected are moderation-only.
    const rows = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.status, "active"))
      .orderBy(desc(adsTable.createdAt))
      .limit(MAX_ADS_PAGE_SIZE);
    res.json(ListAdsPublicResponse.parse(rows));
  }
});

router.get("/ads/:id", async (req, res): Promise<void> => {
  const params = GetAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ad] = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.id, params.data.id));

  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  const isAdmin = req.session?.role === "admin";

  if (!isAdmin) {
    // The ad's own advertiser may always view their own submission so they can
    // track moderation status (pending / rejected). Everyone else — including
    // unauthenticated callers and unrelated members — gets a 404 for any
    // non-active ad so IDs in non-active states are not enumerable.
    const isOwner =
      req.session?.userId !== undefined &&
      ad.advertiserId === req.session.userId;

    if (ad.status !== "active" && !isOwner) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }
    // Strip parentAdId, rejectionChain, and advertiserId from the public
    // schema — even for the owner — so moderation internals stay server-side.
    res.json(GetAdPublicResponse.parse(ad));
    return;
  }

  // Admins: walk the ancestor chain to build the full rejection history,
  // newest ancestor first (immediate parent → grandparent → … → original).
  const rejectionChain: Array<{ id: number; title: string; status: string; createdAt: Date }> = [];
  let ancestorId: number | null = ad.parentAdId;
  let ancestorDepth = 0;
  while (ancestorId !== null && ancestorDepth < MAX_ANCESTOR_CHAIN_DEPTH) {
    const [ancestor] = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.id, ancestorId));
    if (!ancestor) break;
    rejectionChain.push({
      id: ancestor.id,
      title: ancestor.title,
      status: ancestor.status,
      createdAt: ancestor.createdAt,
    });
    ancestorId = ancestor.parentAdId;
    ancestorDepth++;
  }

  res.json(GetAdResponse.parse({ ...ad, rejectionChain }));
});

router.post("/ads", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { replacesAdId, ...adFields } = parsed.data;

  let parentAdId: number | null = null;

  if (replacesAdId !== undefined) {
    const [parentAd] = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.id, replacesAdId));

    if (!parentAd) {
      res.status(404).json({ error: "Referenced ad not found" });
      return;
    }

    if (parentAd.advertiserId !== req.session.userId) {
      res.status(403).json({ error: "You can only resubmit your own ads" });
      return;
    }

    if (parentAd.status !== "rejected") {
      res.status(400).json({
        error: "Only rejected ads can be resubmitted",
      });
      return;
    }

    // Count how many rejected ads exist in this chain (including the immediate
    // parent). The limit is configurable via AD_RESUBMISSION_LIMIT (default 2).
    const resubmissionLimit = parseInt(
      process.env.AD_RESUBMISSION_LIMIT ?? "2",
      10,
    );
    let rejectedCount = 1; // parentAd is already confirmed rejected
    let ancestorId: number | null = parentAd.parentAdId;
    let ancestorDepth = 0;
    while (ancestorId !== null && ancestorDepth < MAX_ANCESTOR_CHAIN_DEPTH) {
      const [ancestor] = await db
        .select()
        .from(adsTable)
        .where(eq(adsTable.id, ancestorId));
      if (!ancestor) break;
      if (ancestor.status === "rejected") rejectedCount++;
      ancestorId = ancestor.parentAdId;
      ancestorDepth++;
    }

    if (rejectedCount >= resubmissionLimit) {
      res.status(403).json({
        error:
          "Resubmission limit reached. Admin approval is required before further submissions.",
      });
      return;
    }

    parentAdId = replacesAdId;
  }

  const [ad] = await db
    .insert(adsTable)
    .values({ ...adFields, advertiserId: req.session.userId!, parentAdId })
    .returning();

  res.status(201).json(CreateAdResponse.parse(ad));
});

router.patch(
  "/ads/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = UpdateAdParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateAdBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }

    const isAdmin = req.session.role === "admin";
    const isOwner = existing.advertiserId === req.session.userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let update: Partial<typeof parsed.data>;

    if (isAdmin) {
      // Admins can change status and content fields
      update = parsed.data;
    } else {
      // Owners can only edit content fields on pending ads
      if (existing.status !== "pending") {
        res
          .status(403)
          .json({ error: "Only pending ads can be edited by their owner" });
        return;
      }
      const { title, content, placement } = parsed.data;
      update = { title, content, placement };
    }

    const [ad] = await db
      .update(adsTable)
      .set(update)
      .where(eq(adsTable.id, params.data.id))
      .returning();

    res.json(UpdateAdResponse.parse(ad));
  },
);

router.delete(
  "/ads/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = DeleteAdParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }

    const isAdmin = req.session.role === "admin";
    const isOwner = existing.advertiserId === req.session.userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!isAdmin && existing.status !== "pending") {
      res
        .status(403)
        .json({ error: "Only pending ads can be withdrawn by their owner" });
      return;
    }

    await db.delete(adsTable).where(eq(adsTable.id, params.data.id));

    res.sendStatus(204);
  },
);

export default router;
