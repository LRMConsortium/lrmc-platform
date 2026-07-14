import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const landListingsTable = pgTable("land_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  location: text("location").notNull(),
  priceCents: integer("price_cents").notNull(),
  sizeMeters: integer("size_meters").notNull(),
  status: text("status").notNull().default("available"), // available | under_contract | sold
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLandListingSchema = createInsertSchema(landListingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLandListing = z.infer<typeof insertLandListingSchema>;
export type LandListing = typeof landListingsTable.$inferSelect;

export const landTransactionsTable = pgTable("land_transactions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id")
    .notNull()
    .references(() => landListingsTable.id),
  buyerId: integer("buyer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"), // pending | completed | cancelled
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLandTransactionSchema = createInsertSchema(
  landTransactionsTable,
).omit({ id: true, createdAt: true, status: true, amountCents: true });
export type InsertLandTransaction = z.infer<typeof insertLandTransactionSchema>;
export type LandTransaction = typeof landTransactionsTable.$inferSelect;
