import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const propertyListingsTable = pgTable("property_listings", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id),
  category: text("category").notNull(), // property | vehicle | airbnb | resort
  title: text("title").notNull(),
  location: text("location").notNull(),
  priceCents: integer("price_cents").notNull(),
  status: text("status").notNull().default("active"), // active | rented | inactive
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPropertyListingSchema = createInsertSchema(
  propertyListingsTable,
).omit({ id: true, createdAt: true });
export type InsertPropertyListing = z.infer<typeof insertPropertyListingSchema>;
export type PropertyListing = typeof propertyListingsTable.$inferSelect;
