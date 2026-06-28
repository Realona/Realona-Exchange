import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const virtualAccountsTable = pgTable("virtual_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  reference: text("reference"),
  flwRef: text("flw_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVirtualAccountSchema = createInsertSchema(virtualAccountsTable).omit({ id: true, createdAt: true });
export type InsertVirtualAccount = z.infer<typeof insertVirtualAccountSchema>;
export type VirtualAccount = typeof virtualAccountsTable.$inferSelect;
