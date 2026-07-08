import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  vehicleInfo: text("vehicle_info").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | suspended
  rating: integer("rating").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({
  id: true,
  createdAt: true,
  status: true,
  rating: true,
});
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;

export const ridesTable = pgTable("rides", {
  id: serial("id").primaryKey(),
  riderId: integer("rider_id")
    .notNull()
    .references(() => usersTable.id),
  driverId: integer("driver_id").references(() => driversTable.id),
  pickup: text("pickup").notNull(),
  dropoff: text("dropoff").notNull(),
  fareCents: integer("fare_cents").notNull(),
  status: text("status").notNull().default("requested"), // requested | accepted | in_progress | completed | cancelled
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({
  id: true,
  createdAt: true,
  status: true,
  driverId: true,
});
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;
