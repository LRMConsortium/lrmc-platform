import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// mailbox: admin.internal | finance.internal | treasury.internal | payments.internal |
//   membership.internal | verification.internal | land.internal | construction.internal |
//   marketplace.internal | store.internal | youth.internal | prospecting.internal |
//   dispatch.internal | drivers.internal | support.internal
export const internalMessagesTable = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => usersTable.id),
  mailbox: varchar("mailbox").notNull(),
  subject: varchar("subject").notNull(),
  body: text("body").notNull().default(""),
  isRead: boolean("is_read").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInternalMessageSchema = createInsertSchema(internalMessagesTable).omit({ id: true, sentAt: true, isRead: true });
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InternalMessage = typeof internalMessagesTable.$inferSelect;
