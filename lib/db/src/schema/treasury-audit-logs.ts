import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const treasuryAuditLogsTable = pgTable("treasury_audit_logs", {
  id: serial("id").primaryKey(),
  actorId: varchar("actor_id").references(() => usersTable.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull().default(""),
  details: varchar("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTreasuryAuditLogSchema = createInsertSchema(treasuryAuditLogsTable).omit({ id: true, createdAt: true });
export type InsertTreasuryAuditLog = z.infer<typeof insertTreasuryAuditLogSchema>;
export type TreasuryAuditLog = typeof treasuryAuditLogsTable.$inferSelect;
