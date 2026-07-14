import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListAssetsQueryParams,
  ListAssetsResponse,
  CreateAssetBody,
  CreateAssetResponse,
  GetAssetParams,
  GetAssetResponse,
  UpdateAssetParams,
  UpdateAssetBody,
  UpdateAssetResponse,
  DeleteAssetParams,
  ApproveAssetParams,
  ApproveAssetResponse,
  RejectAssetParams,
  RejectAssetBody,
  RejectAssetResponse,
  AssignAssetParams,
  AssignAssetBody,
  AssignAssetResponse,
  LinkAssetRevenueParams,
  LinkAssetRevenueBody,
  LinkAssetRevenueResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /assets — list with optional filters
router.get("/assets", async (req, res): Promise<void> => {
  const params = ListAssetsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { category, type, status, ownerId } = params.data;
  const conditions = [
    category ? eq(assetsTable.category, category) : undefined,
    type ? eq(assetsTable.type, type) : undefined,
    status ? eq(assetsTable.status, status) : undefined,
    ownerId ? eq(assetsTable.ownerId, ownerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  const rows =
    conditions.length > 0
      ? await db.select().from(assetsTable).where(and(...conditions)).orderBy(desc(assetsTable.createdAt))
      : await db.select().from(assetsTable).orderBy(desc(assetsTable.createdAt));

  res.json(ListAssetsResponse.parse(rows));
});

// POST /assets — authenticated members register an asset
router.post("/assets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(assetsTable)
    .values({
      ...parsed.data,
      ownerId: req.session.userId!,
      metadata: parsed.data.metadata ?? {},
    })
    .returning();

  res.status(201).json(CreateAssetResponse.parse(row));
});

// GET /assets/:id — detail
router.get("/assets/:id", async (req, res): Promise<void> => {
  const params = GetAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Asset not found" }); return; }

  res.json(GetAssetResponse.parse(row));
});

// PATCH /assets/:id — owner edits their own; admin edits any + can change status
router.patch("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateAssetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const isAdmin = req.session.role === "admin";
  const isOwner = existing.ownerId === req.session.userId;
  if (!isAdmin && !isOwner) { res.status(403).json({ error: "Forbidden" }); return; }

  const update = isAdmin ? parsed.data : { ...parsed.data, status: undefined };

  const [row] = await db.update(assetsTable).set(update).where(eq(assetsTable.id, params.data.id)).returning();
  res.json(UpdateAssetResponse.parse(row));
});

// DELETE /assets/:id — owner (any status) or admin
router.delete("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const isAdmin = req.session.role === "admin";
  const isOwner = existing.ownerId === req.session.userId;
  if (!isAdmin && !isOwner) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(assetsTable).where(eq(assetsTable.id, params.data.id));
  res.sendStatus(204);
});

// POST /assets/:id/approve — admin only
router.post("/assets/:id/approve", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const [row] = await db
    .update(assetsTable)
    .set({ status: "approved" })
    .where(eq(assetsTable.id, params.data.id))
    .returning();

  res.json(ApproveAssetResponse.parse(row));
});

// POST /assets/:id/reject — admin only
router.post("/assets/:id/reject", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = RejectAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = RejectAssetBody.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const updatedMetadata = {
    ...(existing.metadata as Record<string, unknown>),
    ...(parsed.data.reason ? { rejection_reason: parsed.data.reason } : {}),
  };

  const [row] = await db
    .update(assetsTable)
    .set({ status: "rejected", metadata: updatedMetadata })
    .where(eq(assetsTable.id, params.data.id))
    .returning();

  res.json(RejectAssetResponse.parse(row));
});

// POST /assets/:id/assign — admin only, records module assignment in metadata
router.post("/assets/:id/assign", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = AssignAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = AssignAssetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const updatedMetadata = {
    ...(existing.metadata as Record<string, unknown>),
    assigned_module: parsed.data.module,
    ...(parsed.data.notes ? { assignment_notes: parsed.data.notes } : {}),
  };

  const [row] = await db
    .update(assetsTable)
    .set({ status: "active", metadata: updatedMetadata })
    .where(eq(assetsTable.id, params.data.id))
    .returning();

  res.json(AssignAssetResponse.parse(row));
});

// POST /assets/:id/link-revenue — admin only, records revenue link in metadata
router.post("/assets/:id/link-revenue", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = LinkAssetRevenueParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = LinkAssetRevenueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Asset not found" }); return; }

  const updatedMetadata = {
    ...(existing.metadata as Record<string, unknown>),
    revenue_type: parsed.data.revenueType,
    ...(parsed.data.notes ? { revenue_notes: parsed.data.notes } : {}),
  };

  const [row] = await db
    .update(assetsTable)
    .set({ metadata: updatedMetadata })
    .where(eq(assetsTable.id, params.data.id))
    .returning();

  res.json(LinkAssetRevenueResponse.parse(row));
});

export default router;
