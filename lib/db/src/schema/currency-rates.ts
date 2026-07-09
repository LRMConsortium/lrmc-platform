import { pgTable, serial, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const currencyRatesTable = pgTable("currency_rates", {
  id: serial("id").primaryKey(),
  baseCurrency: varchar("base_currency").notNull(),
  quoteCurrency: varchar("quote_currency").notNull(),
  rate: doublePrecision("rate").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCurrencyRateSchema = createInsertSchema(currencyRatesTable).omit({ id: true, asOf: true });
export type InsertCurrencyRate = z.infer<typeof insertCurrencyRateSchema>;
export type CurrencyRate = typeof currencyRatesTable.$inferSelect;
