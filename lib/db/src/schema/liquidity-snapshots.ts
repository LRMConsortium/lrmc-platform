import { pgTable, serial, date, doublePrecision, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status: healthy | watch | critical
export const liquiditySnapshotsTable = pgTable("liquidity_snapshots", {
  id: serial("id").primaryKey(),
  asOfDate: date("as_of_date", { mode: "string" }).notNull(),
  usdBalance: doublePrecision("usd_balance").notNull(),
  gmdBalance: doublePrecision("gmd_balance").notNull(),
  projectedOutflowGmd: doublePrecision("projected_outflow_gmd").notNull().default(0),
  status: varchar("status").notNull().default("healthy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLiquiditySnapshotSchema = createInsertSchema(liquiditySnapshotsTable).omit({ id: true, createdAt: true });
export type InsertLiquiditySnapshot = z.infer<typeof insertLiquiditySnapshotSchema>;
export type LiquiditySnapshot = typeof liquiditySnapshotsTable.$inferSelect;
