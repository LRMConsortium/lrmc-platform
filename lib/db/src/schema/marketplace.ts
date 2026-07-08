import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("active"), // active | sold | inactive
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMarketplaceListingSchema = createInsertSchema(
  marketplaceListingsTable,
).omit({ id: true, createdAt: true, status: true });
export type InsertMarketplaceListing = z.infer<
  typeof insertMarketplaceListingSchema
>;
export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;

export const digitalProductsTable = pgTable("digital_products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDigitalProductSchema = createInsertSchema(
  digitalProductsTable,
).omit({ id: true, createdAt: true });
export type InsertDigitalProduct = z.infer<typeof insertDigitalProductSchema>;
export type DigitalProduct = typeof digitalProductsTable.$inferSelect;

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id")
    .notNull()
    .references(() => usersTable.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  placement: text("placement").notNull(), // homepage | ususu | marketplace
  status: text("status").notNull().default("pending"), // pending | active | rejected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAdSchema = createInsertSchema(adsTable).omit({
  id: true,
  createdAt: true,
  status: true,
});
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;
