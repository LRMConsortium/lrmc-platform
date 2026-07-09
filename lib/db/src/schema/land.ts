import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// status: available | under_offer | sold
export const landListingsTable = pgTable("land_listings", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id").notNull().references(() => usersTable.id),
  title: varchar("title").notNull(),
  location: varchar("location").notNull(),
  sizeAcres: integer("size_acres").notNull(),
  priceUsd: integer("price_usd").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: varchar("image_url"),
  status: varchar("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLandListingSchema = createInsertSchema(landListingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLandListing = z.infer<typeof insertLandListingSchema>;
export type LandListing = typeof landListingsTable.$inferSelect;

// status: pending | closed | cancelled
export const landTransactionsTable = pgTable("land_transactions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => landListingsTable.id),
  buyerId: varchar("buyer_id").notNull().references(() => usersTable.id),
  amountUsd: integer("amount_usd").notNull(),
  status: varchar("status").notNull().default("pending"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLandTransactionSchema = createInsertSchema(landTransactionsTable).omit({ id: true, createdAt: true });
export type InsertLandTransaction = z.infer<typeof insertLandTransactionSchema>;
export type LandTransaction = typeof landTransactionsTable.$inferSelect;
