import { pgTable, serial, date, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const treasuryReservesTable = pgTable("treasury_reserves", {
  id: serial("id").primaryKey(),
  asOfDate: date("as_of_date", { mode: "string" }).notNull(),
  usdReserve: doublePrecision("usd_reserve").notNull(),
  reserveRatio: doublePrecision("reserve_ratio").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTreasuryReserveSchema = createInsertSchema(treasuryReservesTable).omit({ id: true, createdAt: true });
export type InsertTreasuryReserve = z.infer<typeof insertTreasuryReserveSchema>;
export type TreasuryReserve = typeof treasuryReservesTable.$inferSelect;
