import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const pendingRegistrationsTable = pgTable("pending_registrations", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
