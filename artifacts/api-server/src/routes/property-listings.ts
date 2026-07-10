import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, propertyListingsTable } from "@workspace/db";
import {
  ListPropertyListingsQueryParams,
  ListPropertyListingsResponse,
  CreatePropertyListingBody,
  CreatePropertyListingResponse,
  UpdatePropertyListingParams,
  UpdatePropertyListingBody,
  UpdatePropertyListingResponse,
  DeletePropertyListingParams,
} from "@workspace/api-zod";
import { requireAuth, requireApprovedMembership } from "../middlewares/auth";
import { isOwnerOrAdmin } from "../middlewares/authz";

const router: IRouter = Router();

router.get("/property-listings", async (req, res): Promise<void> => {
  const query = ListPropertyListingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.category
    ? await db
        .select()
        .from(propertyListingsTable)
        .where(eq(propertyListingsTable.category, query.data.category))
    : await db.select().from(propertyListingsTable);

  res.json(ListPropertyListingsResponse.parse(rows));
});

router.post("/property-listings", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreatePropertyListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .insert(propertyListingsTable)
    .values({ ...parsed.data, ownerId: req.session.userId! })
    .returning();

  res.status(201).json(CreatePropertyListingResponse.parse(listing));
});

router.patch("/property-listings/:id", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const params = UpdatePropertyListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePropertyListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(propertyListingsTable)
    .where(eq(propertyListingsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Property listing not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, existing.ownerId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [listing] = await db
    .update(propertyListingsTable)
    .set(parsed.data)
    .where(eq(propertyListingsTable.id, params.data.id))
    .returning();

  res.json(UpdatePropertyListingResponse.parse(listing));
});

router.delete("/property-listings/:id", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const params = DeletePropertyListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(propertyListingsTable)
    .where(eq(propertyListingsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Property listing not found" });
    return;
  }

  if (!isOwnerOrAdmin(req, existing.ownerId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .delete(propertyListingsTable)
    .where(eq(propertyListingsTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
