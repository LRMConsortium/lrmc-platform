import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, landListingsTable, landTransactionsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateLandListingBody,
  UpdateLandListingParams,
  UpdateLandListingBody,
  ListLandListingsResponse,
  CreateLandListingResponse,
  UpdateLandListingResponse,
  CreateLandTransactionBody,
  UpdateLandTransactionParams,
  UpdateLandTransactionBody,
  ListLandTransactionsResponse,
  CreateLandTransactionResponse,
  UpdateLandTransactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/land-listings", async (req, res): Promise<void> => {
  const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
  const rows = sellerId
    ? await db.select().from(landListingsTable).where(eq(landListingsTable.sellerId, sellerId))
    : await db.select().from(landListingsTable);
  res.json(ListLandListingsResponse.parse(rows));
});

router.post("/land-listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLandListingBody.safeParse({ ...req.body, sellerId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(landListingsTable).values(parsed.data).returning();
  res.status(201).json(CreateLandListingResponse.parse(row));
});

router.patch("/land-listings/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") {
    const [existing] = await db.select().from(landListingsTable).where(eq(landListingsTable.id, Number(req.params.id)));
    if (!existing || existing.sellerId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const params = UpdateLandListingParams.safeParse(req.params);
  const body = UpdateLandListingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(landListingsTable)
    .set(body.data)
    .where(eq(landListingsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Land listing not found" });
    return;
  }
  res.json(UpdateLandListingResponse.parse(row));
});

router.get("/land-transactions", requireAuth, async (req, res): Promise<void> => {
  const rows =
    req.user!.role === "admin"
      ? await db.select().from(landTransactionsTable)
      : await db.select().from(landTransactionsTable).where(eq(landTransactionsTable.buyerId, req.user!.id));
  res.json(ListLandTransactionsResponse.parse(rows));
});

router.post("/land-transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLandTransactionBody.safeParse({ ...req.body, buyerId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(landTransactionsTable).values(parsed.data).returning();
  res.status(201).json(CreateLandTransactionResponse.parse(row));
});

router.patch("/land-transactions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateLandTransactionParams.safeParse(req.params);
  const body = UpdateLandTransactionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(landTransactionsTable)
    .set(body.data)
    .where(eq(landTransactionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Land transaction not found" });
    return;
  }
  res.json(UpdateLandTransactionResponse.parse(row));
});

export default router;
