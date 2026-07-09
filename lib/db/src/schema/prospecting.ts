import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status: new | contacted | qualified | converted | lost
export const prospectLeadsTable = pgTable("prospect_leads", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  source: varchar("source").notNull().default("website"),
  interest: varchar("interest").notNull().default("membership"),
  status: varchar("status").notNull().default("new"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProspectLeadSchema = createInsertSchema(prospectLeadsTable).omit({ id: true, createdAt: true });
export type InsertProspectLead = z.infer<typeof insertProspectLeadSchema>;
export type ProspectLead = typeof prospectLeadsTable.$inferSelect;
