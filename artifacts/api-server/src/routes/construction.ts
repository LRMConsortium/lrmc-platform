import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  constructionContractorsTable,
  constructionProjectsTable,
} from "@workspace/db";
import {
  ListConstructionContractorsResponse,
  CreateConstructionContractorBody,
  CreateConstructionContractorResponse,
  ListConstructionProjectsResponse,
  CreateConstructionProjectBody,
  CreateConstructionProjectResponse,
  UpdateConstructionProjectParams,
  UpdateConstructionProjectBody,
  UpdateConstructionProjectResponse,
} from "@workspace/api-zod";
import { requireAuth, requireApprovedMembership } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

router.get("/construction-contractors", requireAuth, requireApprovedMembership, async (_req, res): Promise<void> => {
  const rows = await db.select().from(constructionContractorsTable);
  res.json(ListConstructionContractorsResponse.parse(rows));
});

router.post(
  "/construction-contractors",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const parsed = CreateConstructionContractorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [contractor] = await db
      .insert(constructionContractorsTable)
      .values({ ...parsed.data, userId: req.session.userId! })
      .returning();

    res
      .status(201)
      .json(CreateConstructionContractorResponse.parse(contractor));
  },
);

router.get("/construction-projects", requireAuth, requireApprovedMembership, async (_req, res): Promise<void> => {
  const rows = await db.select().from(constructionProjectsTable);
  res.json(ListConstructionProjectsResponse.parse(rows));
});

router.post(
  "/construction-projects",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const parsed = CreateConstructionProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [contractor] = await db
      .select()
      .from(constructionContractorsTable)
      .where(eq(constructionContractorsTable.id, parsed.data.contractorId));

    if (!isOwnerOrAdmin(req, contractor?.userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [project] = await db
      .insert(constructionProjectsTable)
      .values(parsed.data)
      .returning();

    res.status(201).json(CreateConstructionProjectResponse.parse(project));
  },
);

router.patch(
  "/construction-projects/:id",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = UpdateConstructionProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateConstructionProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(constructionProjectsTable)
      .where(eq(constructionProjectsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Construction project not found" });
      return;
    }

    const [contractor] = await db
      .select()
      .from(constructionContractorsTable)
      .where(eq(constructionContractorsTable.id, existing.contractorId));

    if (!contractor) {
      res.status(404).json({ error: "Construction contractor not found" });
      return;
    }

    if (!isOwnerOrAdmin(req, contractor.userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [project] = await db
      .update(constructionProjectsTable)
      .set(parsed.data)
      .where(eq(constructionProjectsTable.id, params.data.id))
      .returning();

    res.json(UpdateConstructionProjectResponse.parse(project));
  },
);

export default router;
