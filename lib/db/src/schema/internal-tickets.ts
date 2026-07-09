import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// department: finance | membership | land | construction | marketplace | youth | dispatch | support | treasury
// status: open | in_progress | resolved | closed
// priority: low | medium | high | urgent
export const internalTicketsTable = pgTable("internal_tickets", {
  id: serial("id").primaryKey(),
  createdBy: varchar("created_by").notNull().references(() => usersTable.id),
  department: varchar("department").notNull().default("support"),
  subject: varchar("subject").notNull(),
  description: text("description").notNull().default(""),
  status: varchar("status").notNull().default("open"),
  priority: varchar("priority").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInternalTicketSchema = createInsertSchema(internalTicketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInternalTicket = z.infer<typeof insertInternalTicketSchema>;
export type InternalTicket = typeof internalTicketsTable.$inferSelect;
