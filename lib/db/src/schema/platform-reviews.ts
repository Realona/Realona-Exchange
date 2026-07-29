import { pgTable, serial, timestamp, integer, text, numeric } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const platformReviewsTable = pgTable("platform_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(), // 1-5
  review: text("review").notNull(),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformReview = typeof platformReviewsTable.$inferSelect;
