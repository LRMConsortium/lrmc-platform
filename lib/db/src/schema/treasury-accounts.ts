import { pgTable, serial, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// currency: USD | GMD
// type: reserve | operational | payroll
export const treasuryAccountsTable = pgTable("treasury_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  currency: varchar("currency").notNull(),
  type: varchar("type").notNull().default("operational"),
  balance: doublePrecision("balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTreasuryAccountSchema = createInsertSchema(treasuryAccountsTable).omit({ id: true, createdAt: true });
export type InsertTreasuryAccount = z.infer<typeof insertTreasuryAccountSchema>;
export type TreasuryAccount = typeof treasuryAccountsTable.$inferSelect;
