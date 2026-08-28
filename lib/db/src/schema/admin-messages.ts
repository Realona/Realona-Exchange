import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const adminMessagesTable = pgTable(
  "admin_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    senderId: integer("sender_id").notNull().references(() => usersTable.id),
    listingId: integer("listing_id").references(() => listingsTable.id, { onDelete: "set null" }),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_messages_user_created_idx").on(table.userId, table.createdAt)],
);

export const insertAdminMessageSchema = createInsertSchema(adminMessagesTable).omit({ id: true, createdAt: true });
export type InsertAdminMessage = z.infer<typeof insertAdminMessageSchema>;
export type AdminMessage = typeof adminMessagesTable.$inferSelect;