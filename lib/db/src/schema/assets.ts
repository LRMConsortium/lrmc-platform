import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// kind: property | vehicle | airbnb | resort
// status: active | pending_review | inactive
export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id").notNull().references(() => usersTable.id),
  kind: varchar("kind").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull().default(""),
  location: varchar("location").notNull().default(""),
  priceDalasi: integer("price_dalasi").notNull().default(0),
  imageUrl: varchar("image_url"),
  status: varchar("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
