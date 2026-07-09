import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status: applied | in_training | placed | completed
export const youthEmploymentRecordsTable = pgTable("youth_employment_records", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  program: varchar("program").notNull().default("general"),
  status: varchar("status").notNull().default("applied"),
  placementCompany: varchar("placement_company"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertYouthEmploymentRecordSchema = createInsertSchema(youthEmploymentRecordsTable).omit({ id: true, createdAt: true });
export type InsertYouthEmploymentRecord = z.infer<typeof insertYouthEmploymentRecordSchema>;
export type YouthEmploymentRecord = typeof youthEmploymentRecordsTable.$inferSelect;
