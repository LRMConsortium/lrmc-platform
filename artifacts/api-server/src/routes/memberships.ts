import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
import {
  ListMembershipsQueryParams,
  ListMembershipsResponse,
  CreateMembershipBody,
  CreateMembershipResponse,
  GetMyMembershipResponse,
  UpdateMembershipParams,
  UpdateMembershipBody,
  UpdateMembershipResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/memberships", requireAdmin, async (req, res): Promise<void> => {
  const query = ListMembershipsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.status
    ? await db
        .select()
        .from(membershipsTable)
        .where(eq(membershipsTable.status, query.data.status))
    : await db.select().from(membershipsTable);

  res.json(ListMembershipsResponse.parse(rows));
});

router.post("/memberships", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [membership] = await db
    .insert(membershipsTable)
    .values({ ...parsed.data, userId: req.session.userId! })
    .returning();

  res.status(201).json(CreateMembershipResponse.parse(membership));
});

router.get("/memberships/me", requireAuth, async (req, res): Promise<void> => {
  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, req.session.userId!));

  if (!membership) {
    res.status(404).json({ error: "No membership found" });
    return;
  }

  res.json(GetMyMembershipResponse.parse(membership));
});

router.patch("/memberships/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateMembershipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [membership] = await db
    .update(membershipsTable)
    .set(parsed.data)
    .where(eq(membershipsTable.id, params.data.id))
    .returning();

  if (!membership) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  res.json(UpdateMembershipResponse.parse(membership));
});

export default router;
