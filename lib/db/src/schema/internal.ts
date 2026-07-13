import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const internalMessagesTable = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInternalMessageSchema = createInsertSchema(
  internalMessagesTable,
).omit({ id: true, createdAt: true, readAt: true, senderId: true });
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InternalMessage = typeof internalMessagesTable.$inferSelect;

export const internalTicketsTable = pgTable("internal_tickets", {
  id: serial("id").primaryKey(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  department: text("department").notNull(), // finance | treasury | membership | land | construction | marketplace | youth | dispatch | support
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInternalTicketSchema = createInsertSchema(
  internalTicketsTable,
).omit({ id: true, createdAt: true, status: true, createdById: true });
export type InsertInternalTicket = z.infer<typeof insertInternalTicketSchema>;
export type InternalTicket = typeof internalTicketsTable.$inferSelect;
