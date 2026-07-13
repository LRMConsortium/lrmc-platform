import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const youthEmploymentRecordsTable = pgTable("youth_employment_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  program: text("program").notNull(),
  status: text("status").notNull().default("enrolled"), // enrolled | training | placed | completed
  placementCompany: text("placement_company"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertYouthEmploymentRecordSchema = createInsertSchema(
  youthEmploymentRecordsTable,
).omit({ id: true, createdAt: true, status: true });
export type InsertYouthEmploymentRecord = z.infer<
  typeof insertYouthEmploymentRecordSchema
>;
export type YouthEmploymentRecord =
  typeof youthEmploymentRecordsTable.$inferSelect;
