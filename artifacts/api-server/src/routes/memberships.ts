import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, membershipsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateMembershipBody,
  UpdateMembershipParams,
  UpdateMembershipBody,
  ListMembershipsResponse,
  CreateMembershipResponse,
  UpdateMembershipResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/memberships", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.user!.role === "admin";
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const userId = isAdmin ? requestedUserId : req.user!.id;
  const rows = userId
    ? await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId))
    : await db.select().from(membershipsTable);
  res.json(ListMembershipsResponse.parse(rows));
});

router.post("/memberships", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMembershipBody.safeParse({ ...req.body, userId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(membershipsTable).values(parsed.data).returning();
  res.status(201).json(CreateMembershipResponse.parse(row));
});

router.patch("/memberships/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateMembershipParams.safeParse(req.params);
  const body = UpdateMembershipBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(membershipsTable)
    .set(body.data)
    .where(eq(membershipsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }
  res.json(UpdateMembershipResponse.parse(row));
});

export default router;
