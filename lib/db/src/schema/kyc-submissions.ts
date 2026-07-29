import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const kycSubmissionsTable = pgTable("kyc_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  // NIN, Driver's License, International Passport, Voter's Card
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  selfieUrl: text("selfie_url"),
  // pending, approved, rejected
  status: text("status").notNull().default("pending"),
  level: integer("level").notNull().default(1), // 1 = id only, 2 = id + selfie + address
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKycSubmissionSchema = createInsertSchema(kycSubmissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKycSubmission = z.infer<typeof insertKycSubmissionSchema>;
export type KycSubmission = typeof kycSubmissionsTable.$inferSelect;
