import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settlementObligationsTable } from "@workspace/db";
import {
  ListSettlementObligationsResponse,
  UpdateSettlementObligationParams,
  UpdateSettlementObligationBody,
  UpdateSettlementObligationResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/settlement-obligations",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(settlementObligationsTable);
    res.json(ListSettlementObligationsResponse.parse(rows));
  },
);

router.patch(
  "/settlement-obligations/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateSettlementObligationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateSettlementObligationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [obligation] = await db
      .update(settlementObligationsTable)
      .set(parsed.data)
      .where(eq(settlementObligationsTable.id, params.data.id))
      .returning();

    if (!obligation) {
      res.status(404).json({ error: "Settlement obligation not found" });
      return;
    }

    res.json(UpdateSettlementObligationResponse.parse(obligation));
  },
);

export default router;
