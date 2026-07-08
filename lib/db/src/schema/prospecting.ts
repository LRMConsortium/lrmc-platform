import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prospectLeadsTable = pgTable("prospect_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  sector: text("sector").notNull(),
  status: text("status").notNull().default("new"), // new | contacted | qualified | converted | lost
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProspectLeadSchema = createInsertSchema(
  prospectLeadsTable,
).omit({ id: true, createdAt: true, status: true });
export type InsertProspectLead = z.infer<typeof insertProspectLeadSchema>;
export type ProspectLead = typeof prospectLeadsTable.$inferSelect;
