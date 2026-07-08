import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  type: text("type").notNull(), // property_owner | vehicle_owner | airbnb_host | resort_owner | land_seller | construction_contractor | advertiser | ususu_driver | renter
  feePaidCents: integer("fee_paid_cents").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | active | rejected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof membershipsTable.$inferSelect;
