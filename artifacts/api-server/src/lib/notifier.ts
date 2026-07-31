import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { emailNotification } from "./email";

type NotificationType =
  | "trade_update"
  | "new_message"
  | "deposit_confirmed"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "offer_received"
  | "offer_responded"
  | "trade_rated"
  | "announcement"
  | "giveaway"
  | "giveaway_reward"
  | "wishlist_sold"
  | "wishlist_price_drop"
  | "deposit_pending";

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
  skipEmail?: boolean
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, metadata: metadata ?? null });
    if (!skipEmail) {
      const [user] = await db
        .select({ email: usersTable.email, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      if (user?.email) {
        emailNotification({ email: user.email, username: user.username, title, message }).catch(() => {});
      }
    }
  } catch {
    // Never let notification errors break the main flow
  }
}
