import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// status: active | sold | removed
export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id").notNull().references(() => usersTable.id),
  title: varchar("title").notNull(),
  description: text("description").notNull().default(""),
  category: varchar("category").notNull().default("general"),
  priceDalasi: integer("price_dalasi").notNull(),
  imageUrl: varchar("image_url"),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListingsTable).omit({ id: true, createdAt: true });
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
