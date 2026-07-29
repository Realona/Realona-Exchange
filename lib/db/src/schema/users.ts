import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),           // admin-created demo/test account
  isVerified: boolean("is_verified").notNull().default(false),   // seller trust badge
  kycLevel: integer("kyc_level").notNull().default(0),           // 0=unverified, 1=id uploaded, 2=fully verified
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
