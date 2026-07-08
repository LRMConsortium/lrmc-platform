import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, youthEmploymentRecordsTable } from "@workspace/db";
import {
  ListYouthEmploymentRecordsResponse,
  CreateYouthEmploymentRecordBody,
  CreateYouthEmploymentRecordResponse,
  UpdateYouthEmploymentRecordParams,
  UpdateYouthEmploymentRecordBody,
  UpdateYouthEmploymentRecordResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

router.get("/youth-employment-records", requireAuth, async (req, res): Promise<void> => {
  const rows =
    req.session.role === "admin"
      ? await db.select().from(youthEmploymentRecordsTable)
      : await db
          .select()
          .from(youthEmploymentRecordsTable)
          .where(eq(youthEmploymentRecordsTable.userId, req.session.userId!));
  res.json(ListYouthEmploymentRecordsResponse.parse(rows));
});

router.post(
  "/youth-employment-records",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateYouthEmploymentRecordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [record] = await db
      .insert(youthEmploymentRecordsTable)
      .values({ ...parsed.data, userId: req.session.userId! })
      .returning();

    res.status(201).json(CreateYouthEmploymentRecordResponse.parse(record));
  },
);

router.patch(
  "/youth-employment-records/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateYouthEmploymentRecordParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateYouthEmploymentRecordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(youthEmploymentRecordsTable)
      .where(eq(youthEmploymentRecordsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Youth employment record not found" });
      return;
    }

    if (!isOwnerOrAdmin(req, existing.userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [record] = await db
      .update(youthEmploymentRecordsTable)
      .set(parsed.data)
      .where(eq(youthEmploymentRecordsTable.id, params.data.id))
      .returning();

    res.json(UpdateYouthEmploymentRecordResponse.parse(record));
  },
);

export default router;
