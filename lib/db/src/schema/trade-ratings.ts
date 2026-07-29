import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { tradesTable } from "./trades";

export const tradeRatingsTable = pgTable("trade_ratings", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => tradesTable.id),
  raterId: integer("rater_id").notNull().references(() => usersTable.id),
  rateeId: integer("ratee_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeRatingSchema = createInsertSchema(tradeRatingsTable).omit({ id: true, createdAt: true });
export type InsertTradeRating = z.infer<typeof insertTradeRatingSchema>;
export type TradeRating = typeof tradeRatingsTable.$inferSelect;
