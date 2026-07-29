import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  agreedAmount: numeric("agreed_amount", { precision: 12, scale: 2 }), // from accepted offer (may differ from listing price)
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull().default("0"),
  // pending, payment_confirmed, seller_transferred, completed, disputed, refunded, cancelled
  status: text("status").notNull().default("pending"),
  disputeReason: text("dispute_reason"),
  accessConfirmed: boolean("access_confirmed").notNull().default(false), // buyer clicked "I Have Accessed the Account"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
