import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const constructionContractorsTable = pgTable("construction_contractors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  companyName: text("company_name").notNull(),
  specialty: text("specialty").notNull(),
  rating: integer("rating").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertConstructionContractorSchema = createInsertSchema(
  constructionContractorsTable,
).omit({ id: true, createdAt: true, rating: true });
export type InsertConstructionContractor = z.infer<
  typeof insertConstructionContractorSchema
>;
export type ConstructionContractor =
  typeof constructionContractorsTable.$inferSelect;

export const constructionProjectsTable = pgTable("construction_projects", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id")
    .notNull()
    .references(() => constructionContractorsTable.id),
  title: text("title").notNull(),
  location: text("location").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  status: text("status").notNull().default("planning"), // planning | in_progress | completed | on_hold
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertConstructionProjectSchema = createInsertSchema(
  constructionProjectsTable,
).omit({ id: true, createdAt: true, status: true });
export type InsertConstructionProject = z.infer<
  typeof insertConstructionProjectSchema
>;
export type ConstructionProject = typeof constructionProjectsTable.$inferSelect;
