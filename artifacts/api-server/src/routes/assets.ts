import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/authz";
import {
  CreateAssetBody,
  UpdateAssetParams,
  UpdateAssetBody,
  DeleteAssetParams,
  ListAssetsResponse,
  CreateAssetResponse,
  UpdateAssetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/assets", async (req, res): Promise<void> => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
  const conditions = [
    kind ? eq(assetsTable.kind, kind) : undefined,
    ownerId ? eq(assetsTable.ownerId, ownerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  const rows = conditions.length
    ? await db.select().from(assetsTable).where(and(...conditions))
    : await db.select().from(assetsTable);
  res.json(ListAssetsResponse.parse(rows));
});

router.post("/assets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse({ ...req.body, ownerId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(assetsTable).values(parsed.data).returning();
  res.status(201).json(CreateAssetResponse.parse(row));
});

router.patch("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  const body = UpdateAssetBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.ownerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [row] = await db
    .update(assetsTable)
    .set(body.data)
    .where(eq(assetsTable.id, params.data.id))
    .returning();
  res.json(UpdateAssetResponse.parse(row));
});

router.delete("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.ownerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(assetsTable).where(eq(assetsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
