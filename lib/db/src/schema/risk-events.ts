import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// type: liquidity | fraud | currency_volatility | settlement_delay | compliance
// severity: low | medium | high | critical
// status: open | monitoring | resolved
export const riskEventsTable = pgTable("risk_events", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(),
  severity: varchar("severity").notNull().default("low"),
  description: text("description").notNull().default(""),
  status: varchar("status").notNull().default("open"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const insertRiskEventSchema = createInsertSchema(riskEventsTable).omit({ id: true, detectedAt: true });
export type InsertRiskEvent = z.infer<typeof insertRiskEventSchema>;
export type RiskEvent = typeof riskEventsTable.$inferSelect;
