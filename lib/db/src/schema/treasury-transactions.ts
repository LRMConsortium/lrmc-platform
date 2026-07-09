import { pgTable, serial, varchar, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { treasuryAccountsTable } from "./treasury-accounts";

// type: credit | debit
// category: ususu_revenue | membership_fee | driver_payout | land_sale | marketplace_sale |
//   digital_product_sale | payroll | settlement | transfer
export const treasuryTransactionsTable = pgTable("treasury_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => treasuryAccountsTable.id),
  type: varchar("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: varchar("category").notNull().default("transfer"),
  description: varchar("description").notNull().default(""),
  relatedPaymentId: integer("related_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTreasuryTransactionSchema = createInsertSchema(treasuryTransactionsTable).omit({ id: true, createdAt: true });
export type InsertTreasuryTransaction = z.infer<typeof insertTreasuryTransactionSchema>;
export type TreasuryTransaction = typeof treasuryTransactionsTable.$inferSelect;
