import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, riskEventsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  CreateRiskEventBody,
  UpdateRiskEventParams,
  UpdateRiskEventBody,
  ListRiskEventsResponse,
  CreateRiskEventResponse,
  UpdateRiskEventResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/risk-events", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = status
    ? await db.select().from(riskEventsTable).where(eq(riskEventsTable.status, status))
    : await db.select().from(riskEventsTable);
  res.json(ListRiskEventsResponse.parse(rows));
});

router.post("/risk-events", async (req, res): Promise<void> => {
  const parsed = CreateRiskEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(riskEventsTable).values(parsed.data).returning();
  res.status(201).json(CreateRiskEventResponse.parse(row));
});

router.patch("/risk-events/:id", async (req, res): Promise<void> => {
  const params = UpdateRiskEventParams.safeParse(req.params);
  const body = UpdateRiskEventBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(riskEventsTable)
    .set(body.data)
    .where(eq(riskEventsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Risk event not found" });
    return;
  }
  res.json(UpdateRiskEventResponse.parse(row));
});

export default router;
