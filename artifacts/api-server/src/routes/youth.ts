import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, youthEmploymentRecordsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateYouthEmploymentRecordBody,
  UpdateYouthEmploymentRecordParams,
  UpdateYouthEmploymentRecordBody,
  ListYouthEmploymentRecordsResponse,
  CreateYouthEmploymentRecordResponse,
  UpdateYouthEmploymentRecordResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/youth-employment-records", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(youthEmploymentRecordsTable);
  res.json(ListYouthEmploymentRecordsResponse.parse(rows));
});

router.post("/youth-employment-records", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateYouthEmploymentRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(youthEmploymentRecordsTable).values(parsed.data).returning();
  res.status(201).json(CreateYouthEmploymentRecordResponse.parse(row));
});

router.patch("/youth-employment-records/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateYouthEmploymentRecordParams.safeParse(req.params);
  const body = UpdateYouthEmploymentRecordBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(youthEmploymentRecordsTable)
    .set(body.data)
    .where(eq(youthEmploymentRecordsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.json(UpdateYouthEmploymentRecordResponse.parse(row));
});

export default router;
