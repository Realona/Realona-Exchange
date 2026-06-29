import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  gameName: text("game_name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  pictureUrl: text("picture_url"),
  accountEmail: text("account_email"),
  accountPassword: text("account_password"),
  divisionRank: text("division_rank"),       // e.g. "Division 1"
  squadRating: integer("squad_rating"),      // 1–99
  status: text("status").notNull().default("active"), // active, sold, deleted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
