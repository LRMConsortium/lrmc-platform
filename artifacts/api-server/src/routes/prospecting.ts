import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, prospectLeadsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  CreateProspectLeadBody,
  UpdateProspectLeadParams,
  UpdateProspectLeadBody,
  ListProspectLeadsResponse,
  CreateProspectLeadResponse,
  UpdateProspectLeadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/prospect-leads", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = status
    ? await db.select().from(prospectLeadsTable).where(eq(prospectLeadsTable.status, status))
    : await db.select().from(prospectLeadsTable);
  res.json(ListProspectLeadsResponse.parse(rows));
});

router.post("/prospect-leads", async (req, res): Promise<void> => {
  const parsed = CreateProspectLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(prospectLeadsTable).values(parsed.data).returning();
  res.status(201).json(CreateProspectLeadResponse.parse(row));
});

router.patch("/prospect-leads/:id", async (req, res): Promise<void> => {
  const params = UpdateProspectLeadParams.safeParse(req.params);
  const body = UpdateProspectLeadBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(prospectLeadsTable)
    .set(body.data)
    .where(eq(prospectLeadsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(UpdateProspectLeadResponse.parse(row));
});

export default router;
