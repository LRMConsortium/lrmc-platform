import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, riskEventsTable } from "@workspace/db";
import {
  ListRiskEventsResponse,
  UpdateRiskEventParams,
  UpdateRiskEventBody,
  UpdateRiskEventResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/risk-events", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(riskEventsTable)
    .orderBy(desc(riskEventsTable.createdAt))
    .limit(100);
  res.json(ListRiskEventsResponse.parse(rows));
});

router.patch("/risk-events/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateRiskEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRiskEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .update(riskEventsTable)
    .set(parsed.data)
    .where(eq(riskEventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Risk event not found" });
    return;
  }

  res.json(UpdateRiskEventResponse.parse(event));
});

export default router;
