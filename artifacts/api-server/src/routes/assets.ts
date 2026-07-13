import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListAssetsResponse,
  ListAssetsQueryParams,
  CreateAssetBody,
  CreateAssetResponse,
  UpdateAssetParams,
  UpdateAssetBody,
  UpdateAssetResponse,
  DeleteAssetParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /assets — public listing; filter by kind or ownerId
router.get("/assets", async (req, res): Promise<void> => {
  const params = ListAssetsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { kind, ownerId } = params.data;
  const conditions = [
    kind ? eq(assetsTable.kind, kind) : undefined,
    ownerId ? eq(assetsTable.ownerId, ownerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(assetsTable)
          .where(and(...conditions))
          .orderBy(desc(assetsTable.createdAt))
      : await db
          .select()
          .from(assetsTable)
          .orderBy(desc(assetsTable.createdAt));

  res.json(ListAssetsResponse.parse(rows));
});

// POST /assets — authenticated members can register an asset
router.post("/assets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(assetsTable)
    .values({ ...parsed.data, ownerId: req.session.userId! })
    .returning();

  res.status(201).json(CreateAssetResponse.parse(row));
});

// PATCH /assets/:id — owner can edit their own; admin can edit any + approve/reject
router.patch("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const isAdmin = req.session.role === "admin";
  const isOwner = existing.ownerId === req.session.userId;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Non-admins cannot change status directly
  const update = isAdmin
    ? parsed.data
    : { ...parsed.data, status: undefined };

  const [row] = await db
    .update(assetsTable)
    .set(update)
    .where(eq(assetsTable.id, params.data.id))
    .returning();

  res.json(UpdateAssetResponse.parse(row));
});

// DELETE /assets/:id — owner (pending only) or admin
router.delete("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const isAdmin = req.session.role === "admin";
  const isOwner = existing.ownerId === req.session.userId;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(assetsTable).where(eq(assetsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
