import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// category: membership | ride | land | construction | marketplace | digital_product | ad
// currency: GMD | USD
// status: pending | completed | failed | refunded
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  category: varchar("category").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency").notNull().default("GMD"),
  relatedId: integer("related_id"),
  status: varchar("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
