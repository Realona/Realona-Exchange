import { db, notificationsTable } from "@workspace/db";

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
  | "deposit_pending";

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, metadata: metadata ?? null });
  } catch {
    // Never let notification errors break the main flow
  }
}
