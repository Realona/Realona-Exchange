import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  // category: efootball | social_media
  category: text("category").notNull().default("efootball"),
  gameName: text("game_name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  pictureUrl: text("picture_url"),

  // eFootball-specific fields
  accountEmail: text("account_email"),
  accountPassword: text("account_password"),
  konamiId: text("konami_id"),           // Konami login ID (hidden from buyers until payment)
  konamiPassword: text("konami_password"), // Konami password (hidden)
  accessCode: text("access_code"),       // OTP / access code (hidden)
  divisionRank: text("division_rank"),
  squadRating: integer("squad_rating"),  // 2000–5000

  // Social media-specific fields
  platform: text("platform"),            // facebook, instagram, tiktok, etc.
  accountHandle: text("account_handle"), // @username or handle
  followerCount: integer("follower_count"),
  following: integer("following"),
  accountAge: text("account_age"),       // "1-6 months", "1+ years", etc.
  engagementRate: text("engagement_rate"),

  status: text("status").notNull().default("active"), // active, sold, deleted
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
