import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, driversTable, ridesTable, paymentsTable, treasuryAccountsTable, treasuryTransactionsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/authz";
import {
  CreateDriverBody,
  UpdateDriverParams,
  UpdateDriverBody,
  ListDriversResponse,
  CreateDriverResponse,
  UpdateDriverResponse,
  CreateRideBody,
  UpdateRideParams,
  UpdateRideBody,
  ListRidesResponse,
  CreateRideResponse,
  UpdateRideResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/drivers", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.user!.role === "admin";
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const userId = isAdmin ? requestedUserId : req.user!.id;
  const rows = userId
    ? await db.select().from(driversTable).where(eq(driversTable.userId, userId))
    : isAdmin
      ? await db.select().from(driversTable)
      : [];
  res.json(ListDriversResponse.parse(rows));
});

router.post("/drivers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse({ ...req.body, userId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(driversTable).values(parsed.data).returning();
  res.status(201).json(CreateDriverResponse.parse(row));
});

router.patch("/drivers/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  const body = UpdateDriverBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(driversTable)
    .set(body.data)
    .where(eq(driversTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(UpdateDriverResponse.parse(row));
});

router.get("/rides", requireAuth, async (req, res): Promise<void> => {
  const requestedRiderId = typeof req.query.riderId === "string" ? req.query.riderId : undefined;
  const riderId = req.user!.role === "admin" ? requestedRiderId : req.user!.id;
  const driverId = typeof req.query.driverId === "string" ? Number(req.query.driverId) : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const conditions = [
    riderId ? eq(ridesTable.riderId, riderId) : undefined,
    driverId ? eq(ridesTable.driverId, driverId) : undefined,
    status ? eq(ridesTable.status, status) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  const rows = conditions.length
    ? await db.select().from(ridesTable).where(and(...conditions))
    : await db.select().from(ridesTable);
  res.json(ListRidesResponse.parse(rows));
});

router.post("/rides", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRideBody.safeParse({ ...req.body, riderId: req.user!.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(ridesTable).values(parsed.data).returning();
  res.status(201).json(CreateRideResponse.parse(row));
});

router.patch("/rides/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRideParams.safeParse(req.params);
  const body = UpdateRideBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [existing] = await db.select().from(ridesTable).where(eq(ridesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }

  if (req.user!.role !== "admin" && existing.riderId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // When a ride is completed for the first time, settle the fare into the
  // LRMC treasury's GMD operational account and record it on the rider's ledger.
  // All of this happens inside one transaction, with the status transition guarded
  // by a conditional update so concurrent requests can't double-settle the same ride.
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ridesTable)
      .set(body.data)
      .where(and(eq(ridesTable.id, params.data.id), eq(ridesTable.status, existing.status)))
      .returning();

    if (!updated) {
      // Someone else changed the ride's status concurrently; nothing more to do.
      return undefined;
    }

    if (body.data.status === "completed" && existing.status !== "completed") {
      const [payment] = await tx
        .insert(paymentsTable)
        .values({
          userId: existing.riderId,
          category: "ride",
          amount: existing.fareGmd,
          currency: "GMD",
          relatedId: existing.id,
          status: "completed",
        })
        .returning();

      const [operationalAccount] = await tx
        .select()
        .from(treasuryAccountsTable)
        .where(and(eq(treasuryAccountsTable.currency, "GMD"), eq(treasuryAccountsTable.type, "operational")))
        .limit(1);

      if (operationalAccount) {
        await tx
          .update(treasuryAccountsTable)
          .set({ balance: sql`${treasuryAccountsTable.balance} + ${existing.fareGmd}` })
          .where(eq(treasuryAccountsTable.id, operationalAccount.id));

        await tx.insert(treasuryTransactionsTable).values({
          accountId: operationalAccount.id,
          type: "credit",
          amount: existing.fareGmd,
          category: "ususu_revenue",
          description: `Ususu ride #${existing.id} settled`,
          relatedPaymentId: payment.id,
        });
      }
    }

    return updated;
  });

  if (!row) {
    res.status(409).json({ error: "Ride status changed concurrently, please retry" });
    return;
  }

  res.json(UpdateRideResponse.parse(row));
});

export default router;
