import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateAdBody,
  UpdateAdParams,
  UpdateAdBody,
  ListAdsResponse,
  CreateAdResponse,
  UpdateAdResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ads", async (req, res): Promise<void> => {
  const advertiserId = typeof req.query.advertiserId === "string" ? req.query.advertiserId : undefined;
  const rows = advertiserId
    ? await db.select().from(adsTable).where(eq(adsTable.advertiserId, advertiserId))
    : await db.select().from(adsTable);
  res.json(ListAdsResponse.parse(rows));
});

router.post("/ads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdBody.safeParse({ ...req.body, advertiserId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(adsTable).values(parsed.data).returning();
  res.status(201).json(CreateAdResponse.parse(row));
});

router.patch("/ads/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdParams.safeParse(req.params);
  const body = UpdateAdBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db.update(adsTable).set(body.data).where(eq(adsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  res.json(UpdateAdResponse.parse(row));
});

export default router;
