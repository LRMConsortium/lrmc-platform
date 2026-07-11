import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
  type: text("type").notNull(), // property_owner | vehicle_owner | airbnb_host | resort_owner | land_seller | construction_contractor | advertiser | ususu_driver | renter
  feePaidCents: integer("fee_paid_cents").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | active | rejected | suspended
  // Membership fee payment gate: members can't reach the KYC step (or the
  // member's area) until this flips to "paid". Free tiers are marked paid
  // immediately on creation since there's nothing to charge.
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  // KYC gate: even after paying, the member's area stays read-only until an
  // admin approves this. "not_submitted" -> "pending" -> approved/rejected.
  // A rejected member can resubmit, which resets this back to "pending".
  kycStatus: text("kyc_status").notNull().default("not_submitted"),
  kycFullName: text("kyc_full_name"),
  kycIdType: text("kyc_id_type"),
  kycIdNumber: text("kyc_id_number"),
  kycNotes: text("kyc_notes"), // admin's reason on rejection
  kycSubmittedAt: timestamp("kyc_submitted_at", { withTimezone: true }),
  kycReviewedAt: timestamp("kyc_reviewed_at", { withTimezone: true }),
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
