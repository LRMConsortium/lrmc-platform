import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, marketplaceListingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/authz";
import {
  CreateMarketplaceListingBody,
  UpdateMarketplaceListingParams,
  UpdateMarketplaceListingBody,
  DeleteMarketplaceListingParams,
  ListMarketplaceListingsResponse,
  CreateMarketplaceListingResponse,
  UpdateMarketplaceListingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/marketplace-listings", async (req, res): Promise<void> => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
  const conditions = [
    category ? eq(marketplaceListingsTable.category, category) : undefined,
    sellerId ? eq(marketplaceListingsTable.sellerId, sellerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  const rows = conditions.length
    ? await db.select().from(marketplaceListingsTable).where(and(...conditions))
    : await db.select().from(marketplaceListingsTable);
  res.json(ListMarketplaceListingsResponse.parse(rows));
});

router.post("/marketplace-listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMarketplaceListingBody.safeParse({ ...req.body, sellerId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(marketplaceListingsTable).values(parsed.data).returning();
  res.status(201).json(CreateMarketplaceListingResponse.parse(row));
});

router.patch("/marketplace-listings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMarketplaceListingParams.safeParse(req.params);
  const body = UpdateMarketplaceListingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [existing] = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.sellerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [row] = await db
    .update(marketplaceListingsTable)
    .set(body.data)
    .where(eq(marketplaceListingsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(UpdateMarketplaceListingResponse.parse(row));
});

router.delete("/marketplace-listings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMarketplaceListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.sellerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
