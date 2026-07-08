import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const treasuryAccountsTable = pgTable("treasury_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(), // USD | GMD
  balanceCents: integer("balance_cents").notNull().default(0),
  type: text("type").notNull(), // usd_reserve | gmd_operational
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type TreasuryAccount = typeof treasuryAccountsTable.$inferSelect;

export const treasuryTransactionsTable = pgTable("treasury_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => treasuryAccountsTable.id),
  type: text("type").notNull(), // deposit | withdrawal | settlement | payout | fee_revenue
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type TreasuryTransaction = typeof treasuryTransactionsTable.$inferSelect;

export const liquiditySnapshotsTable = pgTable("liquidity_snapshots", {
  id: serial("id").primaryKey(),
  totalUsdCents: integer("total_usd_cents").notNull(),
  totalGmdCents: integer("total_gmd_cents").notNull(),
  reserveRatio: real("reserve_ratio").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type LiquiditySnapshot = typeof liquiditySnapshotsTable.$inferSelect;

export const currencyRatesTable = pgTable("currency_rates", {
  id: serial("id").primaryKey(),
  base: text("base").notNull(), // USD
  quote: text("quote").notNull(), // GMD
  rate: real("rate").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type CurrencyRate = typeof currencyRatesTable.$inferSelect;

export const riskEventsTable = pgTable("risk_events", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(), // low | medium | high | critical
  category: text("category").notNull(), // liquidity | fraud | compliance | volatility
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open | monitoring | resolved
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const insertRiskEventSchema = createInsertSchema(riskEventsTable).omit({
  id: true,
  createdAt: true,
  status: true,
});
export type InsertRiskEvent = z.infer<typeof insertRiskEventSchema>;
export type RiskEvent = typeof riskEventsTable.$inferSelect;

export const settlementObligationsTable = pgTable("settlement_obligations", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("pending"), // pending | settled | overdue
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type SettlementObligation = typeof settlementObligationsTable.$inferSelect;
