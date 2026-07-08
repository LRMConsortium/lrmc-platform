import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, landListingsTable, landTransactionsTable } from "@workspace/db";
import {
  ListLandListingsResponse,
  CreateLandListingBody,
  CreateLandListingResponse,
  UpdateLandListingParams,
  UpdateLandListingBody,
  UpdateLandListingResponse,
  ListLandTransactionsResponse,
  CreateLandTransactionBody,
  CreateLandTransactionResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";
import { or, eq as eqOp } from "drizzle-orm";

const router: IRouter = Router();

router.get("/land-listings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(landListingsTable);
  res.json(ListLandListingsResponse.parse(rows));
});

router.post("/land-listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLandListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .insert(landListingsTable)
    .values({ ...parsed.data, sellerId: req.session.userId! })
    .returning();

  res.status(201).json(CreateLandListingResponse.parse(listing));
});

router.patch("/land-listings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLandListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLandListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(landListingsTable)
    .where(eq(landListingsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Land listing not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, existing.sellerId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [listing] = await db
    .update(landListingsTable)
    .set(parsed.data)
    .where(eq(landListingsTable.id, params.data.id))
    .returning();

  res.json(UpdateLandListingResponse.parse(listing));
});

router.get("/land-transactions", requireAuth, async (req, res): Promise<void> => {
  if (req.session.role === "admin") {
    const rows = await db.select().from(landTransactionsTable);
    res.json(ListLandTransactionsResponse.parse(rows));
    return;
  }

  const rows = await db
    .select({
      id: landTransactionsTable.id,
      listingId: landTransactionsTable.listingId,
      buyerId: landTransactionsTable.buyerId,
      amountCents: landTransactionsTable.amountCents,
      status: landTransactionsTable.status,
      createdAt: landTransactionsTable.createdAt,
    })
    .from(landTransactionsTable)
    .innerJoin(landListingsTable, eqOp(landTransactionsTable.listingId, landListingsTable.id))
    .where(
      or(
        eqOp(landTransactionsTable.buyerId, req.session.userId!),
        eqOp(landListingsTable.sellerId, req.session.userId!),
      ),
    );

  res.json(ListLandTransactionsResponse.parse(rows));
});

router.post("/land-transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLandTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .select()
    .from(landListingsTable)
    .where(eq(landListingsTable.id, parsed.data.listingId));

  if (!listing) {
    res.status(404).json({ error: "Land listing not found" });
    return;
  }

  if (listing.sellerId === req.session.userId) {
    res.status(400).json({ error: "You cannot purchase your own listing" });
    return;
  }

  if (listing.status !== "available") {
    res.status(409).json({ error: "Land listing is not available for purchase" });
    return;
  }

  const [transaction] = await db
    .insert(landTransactionsTable)
    .values({
      listingId: listing.id,
      buyerId: req.session.userId!,
      amountCents: listing.priceCents,
      status: "pending",
    })
    .returning();

  await db
    .update(landListingsTable)
    .set({ status: "under_contract" })
    .where(eq(landListingsTable.id, listing.id));

  res.status(201).json(CreateLandTransactionResponse.parse(transaction));
});

export default router;
