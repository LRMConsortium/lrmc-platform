import { Router, type IRouter } from "express";
import { eq, or, desc } from "drizzle-orm";
import { db, internalMessagesTable, internalTicketsTable, membershipsTable, usersTable } from "@workspace/db";
import {
  ListInternalMessagesResponse,
  ListInternalMessagesResponseItem,
  CreateInternalMessageBody,
  CreateInternalMessageResponse,
  MarkInternalMessageReadParams,
  MarkInternalMessageReadResponse,
  ListInternalTicketsResponse,
  CreateInternalTicketBody,
  CreateInternalTicketResponse,
  UpdateInternalTicketParams,
  UpdateInternalTicketBody,
  UpdateInternalTicketResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin, requireApprovedMembership } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/internal-messages", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(internalMessagesTable)
    .where(
      or(
        eq(internalMessagesTable.senderId, userId),
        eq(internalMessagesTable.recipientId, userId),
      ),
    )
    .orderBy(desc(internalMessagesTable.createdAt))
    .limit(100);
  res.json(ListInternalMessagesResponse.parse(rows));
});

router.post("/internal-messages", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreateInternalMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Recipients must be real, approved members or admins -- otherwise the
  // insert result (success vs FK error) becomes a user-ID enumeration oracle,
  // and messages could be sent to accounts that can never even read them.
  const [recipient] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.recipientId));

  let recipientIsEligible = !!recipient && recipient.role === "admin";
  if (recipient && !recipientIsEligible) {
    const [recipientMembership] = await db
      .select({
        paymentStatus: membershipsTable.paymentStatus,
        kycStatus: membershipsTable.kycStatus,
      })
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, parsed.data.recipientId));

    recipientIsEligible =
      !!recipientMembership &&
      recipientMembership.paymentStatus === "paid" &&
      recipientMembership.kycStatus === "approved";
  }

  if (!recipientIsEligible) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  const [message] = await db
    .insert(internalMessagesTable)
    .values({ ...parsed.data, senderId: req.session.userId! })
    .returning();

  res.status(201).json(CreateInternalMessageResponse.parse(message));
});

router.get("/internal-messages/:id", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const params = MarkInternalMessageReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(internalMessagesTable)
    .where(eq(internalMessagesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Internal message not found" });
    return;
  }

  const userId = req.session.userId!;
  if (
    req.session.role !== "admin" &&
    existing.recipientId !== userId &&
    existing.senderId !== userId
  ) {
    // Return 404 (not 403) to prevent non-party members from probing whether a
    // message ID exists — a 403 would confirm the ID is valid.
    res.status(404).json({ error: "Internal message not found" });
    return;
  }

  res.json(ListInternalMessagesResponseItem.parse(existing));
});

router.patch(
  "/internal-messages/:id/read",
  requireAuth, requireApprovedMembership,
  async (req, res): Promise<void> => {
    const params = MarkInternalMessageReadParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(internalMessagesTable)
      .where(eq(internalMessagesTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Internal message not found" });
      return;
    }

    const userId = req.session.userId!;
    if (
      req.session.role !== "admin" &&
      existing.recipientId !== userId &&
      existing.senderId !== userId
    ) {
      // Return 404 (not 403) to prevent non-party members from probing whether
      // a message ID exists — a 403 would confirm the ID is valid.
      res.status(404).json({ error: "Internal message not found" });
      return;
    }

    const [message] = await db
      .update(internalMessagesTable)
      .set({ readAt: new Date() })
      .where(eq(internalMessagesTable.id, params.data.id))
      .returning();

    res.json(MarkInternalMessageReadResponse.parse(message));
  },
);

router.get("/internal-tickets", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const rows =
    req.session.role === "admin"
      ? await db
          .select()
          .from(internalTicketsTable)
          .orderBy(desc(internalTicketsTable.createdAt))
          .limit(100)
      : await db
          .select()
          .from(internalTicketsTable)
          .where(eq(internalTicketsTable.createdById, req.session.userId!))
          .orderBy(desc(internalTicketsTable.createdAt))
          .limit(100);

  res.json(ListInternalTicketsResponse.parse(rows));
});

router.post("/internal-tickets", requireAuth, requireApprovedMembership, async (req, res): Promise<void> => {
  const parsed = CreateInternalTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ticket] = await db
    .insert(internalTicketsTable)
    .values({ ...parsed.data, createdById: req.session.userId! })
    .returning();

  res.status(201).json(CreateInternalTicketResponse.parse(ticket));
});

router.patch(
  "/internal-tickets/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateInternalTicketParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateInternalTicketBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [ticket] = await db
      .update(internalTicketsTable)
      .set(parsed.data)
      .where(eq(internalTicketsTable.id, params.data.id))
      .returning();

    if (!ticket) {
      res.status(404).json({ error: "Internal ticket not found" });
      return;
    }

    res.json(UpdateInternalTicketResponse.parse(ticket));
  },
);

export default router;
