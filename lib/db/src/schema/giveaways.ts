import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const giveawaysTable = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  rewardAmount: numeric("reward_amount", { precision: 12, scale: 2 }).notNull(),
  maxUsers: integer("max_users").notNull(),
  claimedCount: integer("claimed_count").notNull().default(0),
  // registration, first_trade, first_listing, referral
  taskType: text("task_type").notNull().default("registration"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const giveawayClaimsTable = pgTable("giveaway_claims", {
  id: serial("id").primaryKey(),
  giveawayId: integer("giveaway_id").notNull().references(() => giveawaysTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGiveawaySchema = createInsertSchema(giveawaysTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Giveaway = typeof giveawaysTable.$inferSelect;
export type GiveawayClaim = typeof giveawayClaimsTable.$inferSelect;
