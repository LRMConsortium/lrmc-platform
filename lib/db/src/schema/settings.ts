import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Key/value store for platform-wide admin-configurable settings.
 * e.g. usd_to_gmd_rate = "70"
 */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
