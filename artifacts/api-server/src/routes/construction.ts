import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, constructionContractorsTable, constructionProjectsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateConstructionContractorBody,
  UpdateConstructionContractorParams,
  UpdateConstructionContractorBody,
  ListConstructionContractorsResponse,
  CreateConstructionContractorResponse,
  UpdateConstructionContractorResponse,
  CreateConstructionProjectBody,
  UpdateConstructionProjectParams,
  UpdateConstructionProjectBody,
  ListConstructionProjectsResponse,
  CreateConstructionProjectResponse,
  UpdateConstructionProjectResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/construction-contractors", async (_req, res): Promise<void> => {
  const rows = await db.select().from(constructionContractorsTable);
  res.json(ListConstructionContractorsResponse.parse(rows));
});

router.post("/construction-contractors", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateConstructionContractorBody.safeParse({ ...req.body, userId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(constructionContractorsTable).values(parsed.data).returning();
  res.status(201).json(CreateConstructionContractorResponse.parse(row));
});

router.patch("/construction-contractors/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateConstructionContractorParams.safeParse(req.params);
  const body = UpdateConstructionContractorBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(constructionContractorsTable)
    .set(body.data)
    .where(eq(constructionContractorsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Contractor not found" });
    return;
  }
  res.json(UpdateConstructionContractorResponse.parse(row));
});

router.get("/construction-projects", async (req, res): Promise<void> => {
  const contractorId = typeof req.query.contractorId === "string" ? Number(req.query.contractorId) : undefined;
  const rows = contractorId
    ? await db.select().from(constructionProjectsTable).where(eq(constructionProjectsTable.contractorId, contractorId))
    : await db.select().from(constructionProjectsTable);
  res.json(ListConstructionProjectsResponse.parse(rows));
});

router.post("/construction-projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateConstructionProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (req.user!.role !== "admin") {
    const [contractor] = await db
      .select()
      .from(constructionContractorsTable)
      .where(eq(constructionContractorsTable.id, parsed.data.contractorId));
    if (!contractor || contractor.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const [row] = await db.insert(constructionProjectsTable).values(parsed.data).returning();
  res.status(201).json(CreateConstructionProjectResponse.parse(row));
});

router.patch("/construction-projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateConstructionProjectParams.safeParse(req.params);
  const body = UpdateConstructionProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(constructionProjectsTable)
    .set(body.data)
    .where(eq(constructionProjectsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UpdateConstructionProjectResponse.parse(row));
});

export default router;
