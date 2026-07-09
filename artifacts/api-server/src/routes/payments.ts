import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/authz";
import { ListPaymentsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.user!.role === "admin";
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const userId = isAdmin ? requestedUserId : req.user!.id;
  const rows = userId
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.userId, userId))
    : await db.select().from(paymentsTable);
  res.json(ListPaymentsResponse.parse(rows));
});

export default router;
