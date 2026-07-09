import { pgTable, serial, varchar, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// status: pending | approved | suspended
export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  vehicleInfo: varchar("vehicle_info").notNull().default(""),
  licenseNumber: varchar("license_number").notNull().default(""),
  status: varchar("status").notNull().default("pending"),
  rating: doublePrecision("rating").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;

// status: requested | accepted | in_progress | completed | cancelled
export const ridesTable = pgTable("rides", {
  id: serial("id").primaryKey(),
  riderId: varchar("rider_id").notNull().references(() => usersTable.id),
  driverId: integer("driver_id").references(() => driversTable.id),
  pickup: varchar("pickup").notNull(),
  dropoff: varchar("dropoff").notNull(),
  fareGmd: integer("fare_gmd").notNull(),
  status: varchar("status").notNull().default("requested"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({ id: true, requestedAt: true });
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;
