import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, digitalProductsTable, paymentsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  CreateDigitalProductBody,
  PurchaseDigitalProductParams,
  ListDigitalProductsResponse,
  CreateDigitalProductResponse,
  PurchaseDigitalProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/digital-products", async (_req, res): Promise<void> => {
  const rows = await db.select().from(digitalProductsTable);
  res.json(ListDigitalProductsResponse.parse(rows));
});

router.post("/digital-products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateDigitalProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(digitalProductsTable).values(parsed.data).returning();
  res.status(201).json(CreateDigitalProductResponse.parse(row));
});

router.post("/digital-products/:id/purchase", async (req, res): Promise<void> => {
  const params = PurchaseDigitalProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const product = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(digitalProductsTable)
      .set({ downloads: sql`${digitalProductsTable.downloads} + 1` })
      .where(eq(digitalProductsTable.id, params.data.id))
      .returning();

    if (!updated) {
      return undefined;
    }

    await tx.insert(paymentsTable).values({
      userId,
      category: "digital_product",
      amount: updated.priceDalasi,
      currency: "GMD",
      relatedId: updated.id,
      status: "completed",
    });

    return updated;
  });

  if (!product) {
    res.status(404).json({ error: "Digital product not found" });
    return;
  }

  res.json(PurchaseDigitalProductResponse.parse(product));
});

export default router;
