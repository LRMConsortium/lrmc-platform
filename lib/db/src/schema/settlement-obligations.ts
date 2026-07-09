import { pgTable, serial, varchar, doublePrecision, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// payeeType: driver | contractor | vendor | landowner
// currency: USD | GMD
// status: scheduled | paid | overdue | cancelled
export const settlementObligationsTable = pgTable("settlement_obligations", {
  id: serial("id").primaryKey(),
  payeeType: varchar("payee_type").notNull(),
  payeeName: varchar("payee_name").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency").notNull().default("GMD"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  status: varchar("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettlementObligationSchema = createInsertSchema(settlementObligationsTable).omit({ id: true, createdAt: true });
export type InsertSettlementObligation = z.infer<typeof insertSettlementObligationSchema>;
export type SettlementObligation = typeof settlementObligationsTable.$inferSelect;
