import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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
  ListDigitalProductsResponse,
  CreateDigitalProductBody,
  CreateDigitalProductResponse,
  PurchaseDigitalProductParams,
  PurchaseDigitalProductResponse,
  ListAdsResponse,
  CreateAdBody,
  CreateAdResponse,
  UpdateAdParams,
  UpdateAdBody,
  UpdateAdResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
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

router.get("/digital-products", async (_req, res): Promise<void> => {
  const rows = await db.select().from(digitalProductsTable);
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
      .values(parsed.data)
      .returning();

    res.status(201).json(CreateDigitalProductResponse.parse(product));
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

    res.json(
      PurchaseDigitalProductResponse.parse({
        productId: product.id,
        amountCents: product.priceCents,
        message: `Purchase of "${product.title}" confirmed.`,
      }),
    );
  },
);

router.get("/ads", async (_req, res): Promise<void> => {
  const rows = await db.select().from(adsTable);
  res.json(ListAdsResponse.parse(rows));
});

router.post("/ads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ad] = await db
    .insert(adsTable)
    .values({ ...parsed.data, advertiserId: req.session.userId! })
    .returning();

  res.status(201).json(CreateAdResponse.parse(ad));
});

router.patch("/ads/:id", requireAdmin, async (req, res): Promise<void> => {
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

  const [ad] = await db
    .update(adsTable)
    .set(parsed.data)
    .where(eq(adsTable.id, params.data.id))
    .returning();

  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  res.json(UpdateAdResponse.parse(ad));
});

export default router;
