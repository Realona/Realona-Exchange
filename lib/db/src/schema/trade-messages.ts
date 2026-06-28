import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { tradesTable } from "./trades";

export const tradeMessagesTable = pgTable("trade_messages", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => tradesTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  message: text("message").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeMessageSchema = createInsertSchema(tradeMessagesTable).omit({ id: true, createdAt: true });
export type InsertTradeMessage = z.infer<typeof insertTradeMessageSchema>;
export type TradeMessage = typeof tradeMessagesTable.$inferSelect;
