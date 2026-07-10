import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, ridesTable } from "@workspace/db";
import {
  ListDriversResponse,
  CreateDriverBody,
  CreateDriverResponse,
  UpdateDriverParams,
  UpdateDriverBody,
  UpdateDriverResponse,
  ListRidesResponse,
  CreateRideBody,
  CreateRideResponse,
  UpdateRideParams,
  UpdateRideBody,
  UpdateRideResponse,
} from "@workspace/api-zod";
import { requireAuth, requireApprovedMembership } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

router.get("/drivers", requireAuth, requireApprovedMembership, async (_req, res): Promise<void> => {
  const rows = await db.select().from(driversTable);
  res.json(ListDriversResponse.parse(rows));
});

router.post("/drivers", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [driver] = await db
    .insert(driversTable)
    .values({ ...parsed.data, userId: req.session.userId! })
    .returning();

  res.status(201).json(CreateDriverResponse.parse(driver));
});

router.patch("/drivers/:id", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, existing.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [driver] = await db
    .update(driversTable)
    .set(parsed.data)
    .where(eq(driversTable.id, params.data.id))
    .returning();

  res.json(UpdateDriverResponse.parse(driver));
});

router.get("/rides", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const rows =
    req.session.role === "admin"
      ? await db.select().from(ridesTable)
      : await db.select().from(ridesTable).where(eq(ridesTable.riderId, req.session.userId!));
  res.json(ListRidesResponse.parse(rows));
});

router.post("/rides", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreateRideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ride] = await db
    .insert(ridesTable)
    .values({ ...parsed.data, riderId: req.session.userId! })
    .returning();

  res.status(201).json(CreateRideResponse.parse(ride));
});

router.patch("/rides/:id", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const params = UpdateRideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(ridesTable)
    .where(eq(ridesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }

  const isAdmin = req.session.role === "admin";
  if (!isOwnerOrAdmin(req, existing.riderId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Riders may only cancel their own ride while it hasn't started yet.
  // Every other transition (acceptance, progress, completion, driver
  // assignment) must be driven by a driver/dispatcher or an admin.
  if (!isAdmin) {
    const isSelfCancel =
      parsed.data.status === "cancelled" &&
      (existing.status === "requested" || existing.status === "accepted") &&
      parsed.data.driverId === undefined;

    if (!isSelfCancel || Object.keys(parsed.data).length !== 1) {
      res.status(403).json({
        error:
          "Riders may only cancel a ride that has not yet started; other updates require a driver or admin",
      });
      return;
    }
  }

  const [ride] = await db
    .update(ridesTable)
    .set(parsed.data)
    .where(eq(ridesTable.id, params.data.id))
    .returning();

  res.json(UpdateRideResponse.parse(ride));
});

export default router;
