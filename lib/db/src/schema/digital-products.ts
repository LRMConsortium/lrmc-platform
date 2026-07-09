import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// category: legal_document | template | guide | certificate
export const digitalProductsTable = pgTable("digital_products", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull().default(""),
  category: varchar("category").notNull().default("template"),
  priceDalasi: integer("price_dalasi").notNull(),
  downloads: integer("downloads").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDigitalProductSchema = createInsertSchema(digitalProductsTable).omit({ id: true, createdAt: true, downloads: true });
export type InsertDigitalProduct = z.infer<typeof insertDigitalProductSchema>;
export type DigitalProduct = typeof digitalProductsTable.$inferSelect;
