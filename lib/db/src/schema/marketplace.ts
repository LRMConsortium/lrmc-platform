import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
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
  sellerId: integer("seller_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("active"), // active | archived
  // Link to the hosted deliverable (e.g. a PDF) emailed to buyers after payment.
  fileUrl: text("file_url"),
  // Real Stripe catalog objects backing this product, created/refreshed via
  // the Stripe API whenever the product is created or its price changes.
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDigitalProductSchema = createInsertSchema(
  digitalProductsTable,
).omit({
  id: true,
  createdAt: true,
  sellerId: true,
  status: true,
  stripeProductId: true,
  stripePriceId: true,
});
export type InsertDigitalProduct = z.infer<typeof insertDigitalProductSchema>;
export type DigitalProduct = typeof digitalProductsTable.$inferSelect;

// One row per Stripe Checkout session created against a digital product.
// This is the durable order/receipt record -- NOT Stripe catalog data, so it
// belongs in our own schema rather than the stripe-replit-sync `stripe` schema.
export const digitalProductPurchasesTable = pgTable(
  "digital_product_purchases",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => digitalProductsTable.id),
    // Set when the buyer was signed in at checkout time; null for guests.
    // ON DELETE SET NULL: purchase records are kept for financial audit when a user is deleted.
    buyerId: integer("buyer_id").references(() => usersTable.id, { onDelete: "set null" }),
    buyerEmail: text("buyer_email").notNull(),
    amountCents: integer("amount_cents").notNull(),
    memberDiscountApplied: boolean("member_discount_applied")
      .notNull()
      .default(false),
    stripeCheckoutSessionId: text("stripe_checkout_session_id")
      .notNull()
      .unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: text("status").notNull().default("pending"), // pending | paid | failed
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    // Set only after the delivery email is confirmed sent. Kept separate
    // from `status` so a payment can be marked paid atomically while the
    // email step remains independently retryable (e.g. if Resend is briefly
    // down, a later duplicate webhook delivery will retry just the email).
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type DigitalProductPurchase =
  typeof digitalProductPurchasesTable.$inferSelect;

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  placement: text("placement").notNull(), // homepage | ususu | marketplace
  status: text("status").notNull().default("pending"), // pending | active | rejected
  parentAdId: integer("parent_ad_id"),
  rejectionNote: text("rejection_note"), // nullable; set by admin when rejecting
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
