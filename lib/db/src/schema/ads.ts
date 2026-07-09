import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// placement: website | app | ususu_app
// status: pending | active | ended
export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  advertiserId: varchar("advertiser_id").notNull().references(() => usersTable.id),
  title: varchar("title").notNull(),
  description: text("description").notNull().default(""),
  placement: varchar("placement").notNull().default("website"),
  budgetUsd: integer("budget_usd").notNull().default(0),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdSchema = createInsertSchema(adsTable).omit({ id: true, createdAt: true });
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;
