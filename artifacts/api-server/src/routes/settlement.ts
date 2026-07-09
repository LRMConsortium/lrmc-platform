import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settlementObligationsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  CreateSettlementObligationBody,
  UpdateSettlementObligationParams,
  UpdateSettlementObligationBody,
  ListSettlementObligationsResponse,
  CreateSettlementObligationResponse,
  UpdateSettlementObligationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/settlement-obligations", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = status
    ? await db.select().from(settlementObligationsTable).where(eq(settlementObligationsTable.status, status))
    : await db.select().from(settlementObligationsTable);
  res.json(ListSettlementObligationsResponse.parse(rows));
});

router.post("/settlement-obligations", async (req, res): Promise<void> => {
  const parsed = CreateSettlementObligationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(settlementObligationsTable).values(parsed.data).returning();
  res.status(201).json(CreateSettlementObligationResponse.parse(row));
});

router.patch("/settlement-obligations/:id", async (req, res): Promise<void> => {
  const params = UpdateSettlementObligationParams.safeParse(req.params);
  const body = UpdateSettlementObligationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(settlementObligationsTable)
    .set(body.data)
    .where(eq(settlementObligationsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Settlement obligation not found" });
    return;
  }
  res.json(UpdateSettlementObligationResponse.parse(row));
});

export default router;
