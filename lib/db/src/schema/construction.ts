import { pgTable, serial, varchar, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// status: pending | verified | suspended
export const constructionContractorsTable = pgTable("construction_contractors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  companyName: varchar("company_name").notNull(),
  specialty: varchar("specialty").notNull().default(""),
  licenseNumber: varchar("license_number").notNull().default(""),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionContractorSchema = createInsertSchema(constructionContractorsTable).omit({ id: true, createdAt: true });
export type InsertConstructionContractor = z.infer<typeof insertConstructionContractorSchema>;
export type ConstructionContractor = typeof constructionContractorsTable.$inferSelect;

// status: planning | in_progress | completed | on_hold
export const constructionProjectsTable = pgTable("construction_projects", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull().references(() => constructionContractorsTable.id),
  title: varchar("title").notNull(),
  location: varchar("location").notNull().default(""),
  budgetUsd: integer("budget_usd").notNull().default(0),
  status: varchar("status").notNull().default("planning"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConstructionProjectSchema = createInsertSchema(constructionProjectsTable).omit({ id: true, createdAt: true });
export type InsertConstructionProject = z.infer<typeof insertConstructionProjectSchema>;
export type ConstructionProject = typeof constructionProjectsTable.$inferSelect;
