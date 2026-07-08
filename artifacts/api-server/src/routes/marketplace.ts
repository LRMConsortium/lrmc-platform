import { Router, type IRouter } from "express";
import { and, eq, ne } from "drizzle-orm";
import {
  db,
  marketplaceListingsTable,
  digitalProductsTable,
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

// Public ad schemas: strip admin-only moderation fields from non-admin responses.
// Add new admin-only fields here so they are never accidentally leaked.
const ListAdsPublicResponseItem = ListAdsResponseItem.omit({ parentAdId: true });
const ListAdsPublicResponse = ListAdsPublicResponseItem.array();
// Single-ad public schema: omit parentAdId so non-admins cannot traverse the chain.
const GetAdPublicResponse = GetAdResponse.omit({ parentAdId: true, rejectionChain: true });
import { requireAuth } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

router.get("/marketplace-listings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(marketplaceListingsTable);
  res.json(ListMarketplaceListingsResponse.parse(rows));
});

router.post(
  "/marketplace-listings",
  requireAuth,
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
  requireAuth,
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

    const [listing] = await db
      .update(marketplaceListingsTable)
      .set(parsed.data)
      .where(eq(marketplaceListingsTable.id, params.data.id))
      .returning();

    res.json(UpdateMarketplaceListingResponse.parse(listing));
  },
);

router.delete(
  "/marketplace-listings/:id",
  requireAuth,
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

router.get("/digital-products", async (req, res): Promise<void> => {
  const query = ListDigitalProductsQueryParams.safeParse(req.query);
  const statusFilter = query.success && query.data.status ? query.data.status : "active";

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
      );
    res.json(ListDigitalProductsResponse.parse(rows));
    return;
  }

  const rows = await db
    .select()
    .from(digitalProductsTable)
    .where(eq(digitalProductsTable.status, statusFilter));
  res.json(ListDigitalProductsResponse.parse(rows));
});

router.post(
  "/digital-products",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateDigitalProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [product] = await db
      .insert(digitalProductsTable)
      .values({ ...parsed.data, sellerId: req.session.userId! })
      .returning();

    res.status(201).json(CreateDigitalProductResponse.parse(product));
  },
);

router.patch(
  "/digital-products/:id",
  requireAuth,
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

    const [product] = await db
      .update(digitalProductsTable)
      .set(parsed.data)
      .where(eq(digitalProductsTable.id, params.data.id))
      .returning();

    res.json(UpdateDigitalProductResponse.parse(product));
  },
);

router.delete(
  "/digital-products/:id",
  requireAuth,
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
  "/digital-products/:id/purchase",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = PurchaseDigitalProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [product] = await db
      .select()
      .from(digitalProductsTable)
      .where(eq(digitalProductsTable.id, params.data.id));

    if (!product) {
      res.status(404).json({ error: "Digital product not found" });
      return;
    }

    // Only "active" products are visible to buyers in the default listing.
    // Reject purchase of any non-active product so the purchase gate always
    // mirrors the visibility rules — regardless of how many statuses are added
    // in the future.
    if (product.status !== "active") {
      res.status(410).json({ error: "This product is no longer available" });
      return;
    }

    res.json(
      PurchaseDigitalProductResponse.parse({
        productId: product.id,
        amountCents: product.priceCents,
        message: `Purchase of "${product.title}" confirmed.`,
      }),
    );
  },
);

router.get("/ads", async (req, res): Promise<void> => {
  const isAdmin = req.session?.role === "admin";
  if (isAdmin) {
    const rows = await db.select().from(adsTable);
    res.json(ListAdsResponse.parse(rows));
  } else {
    // Non-admins only see approved ads — pending and rejected are moderation-only.
    const rows = await db
      .select()
      .from(adsTable)
      .where(eq(adsTable.status, "active"));
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
    // Non-admins: strip parentAdId and rejectionChain so the moderation chain
    // cannot be traversed by making repeated GET /ads/:id calls.
    res.json(GetAdPublicResponse.parse(ad));
    return;
  }

  // Admins: walk the ancestor chain to build the full rejection history,
  // newest ancestor first (immediate parent → grandparent → … → original).
  const rejectionChain: Array<{ id: number; title: string; status: string; createdAt: Date }> = [];
  let ancestorId: number | null = ad.parentAdId;
  while (ancestorId !== null) {
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
  }

  res.json(GetAdResponse.parse({ ...ad, rejectionChain }));
});

router.post("/ads", requireAuth, async (req, res): Promise<void> => {
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
    while (ancestorId !== null) {
      const [ancestor] = await db
        .select()
        .from(adsTable)
        .where(eq(adsTable.id, ancestorId));
      if (!ancestor) break;
      if (ancestor.status === "rejected") rejectedCount++;
      ancestorId = ancestor.parentAdId;
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
  requireAuth,
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
  requireAuth,
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
