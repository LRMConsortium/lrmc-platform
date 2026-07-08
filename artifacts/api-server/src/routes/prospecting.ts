import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, prospectLeadsTable } from "@workspace/db";
import {
  ListProspectLeadsResponse,
  CreateProspectLeadBody,
  CreateProspectLeadResponse,
  UpdateProspectLeadParams,
  UpdateProspectLeadBody,
  UpdateProspectLeadResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/prospect-leads", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(prospectLeadsTable);
  res.json(ListProspectLeadsResponse.parse(rows));
});

router.post("/prospect-leads", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProspectLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(prospectLeadsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(CreateProspectLeadResponse.parse(lead));
});

router.patch("/prospect-leads/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProspectLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProspectLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(prospectLeadsTable)
    .set(parsed.data)
    .where(eq(prospectLeadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Prospect lead not found" });
    return;
  }

  res.json(UpdateProspectLeadResponse.parse(lead));
});

export default router;
