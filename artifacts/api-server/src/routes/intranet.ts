import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, internalMessagesTable, internalTicketsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/authz";
import {
  CreateInternalMessageBody,
  MarkInternalMessageReadParams,
  ListInternalMessagesResponse,
  CreateInternalMessageResponse,
  MarkInternalMessageReadResponse,
  CreateInternalTicketBody,
  UpdateInternalTicketParams,
  UpdateInternalTicketBody,
  ListInternalTicketsResponse,
  CreateInternalTicketResponse,
  UpdateInternalTicketResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/internal-messages", async (req, res): Promise<void> => {
  const mailbox = typeof req.query.mailbox === "string" ? req.query.mailbox : undefined;
  const rows = mailbox
    ? await db.select().from(internalMessagesTable).where(eq(internalMessagesTable.mailbox, mailbox))
    : await db.select().from(internalMessagesTable);
  res.json(ListInternalMessagesResponse.parse(rows));
});

router.post("/internal-messages", async (req, res): Promise<void> => {
  const parsed = CreateInternalMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(internalMessagesTable).values(parsed.data).returning();
  res.status(201).json(CreateInternalMessageResponse.parse(row));
});

router.patch("/internal-messages/:id/read", async (req, res): Promise<void> => {
  const params = MarkInternalMessageReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .update(internalMessagesTable)
    .set({ isRead: true })
    .where(eq(internalMessagesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  res.json(MarkInternalMessageReadResponse.parse(row));
});

router.get("/internal-tickets", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const department = typeof req.query.department === "string" ? req.query.department : undefined;
  const conditions = [
    status ? eq(internalTicketsTable.status, status) : undefined,
    department ? eq(internalTicketsTable.department, department) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  const rows = conditions.length
    ? await db.select().from(internalTicketsTable).where(and(...conditions))
    : await db.select().from(internalTicketsTable);
  res.json(ListInternalTicketsResponse.parse(rows));
});

router.post("/internal-tickets", async (req, res): Promise<void> => {
  const parsed = CreateInternalTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(internalTicketsTable).values(parsed.data).returning();
  res.status(201).json(CreateInternalTicketResponse.parse(row));
});

router.patch("/internal-tickets/:id", async (req, res): Promise<void> => {
  const params = UpdateInternalTicketParams.safeParse(req.params);
  const body = UpdateInternalTicketBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const [row] = await db
    .update(internalTicketsTable)
    .set(body.data)
    .where(eq(internalTicketsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(UpdateInternalTicketResponse.parse(row));
});

export default router;
