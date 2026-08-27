import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { createNotification } from "./notifier";
import { emailNotification } from "./email";
import { logger } from "./logger";

type AdminActivity = {
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Sends the same operational alert to every admin and superadmin.
 * In-app notifications and email are deliberately handled separately so
 * callers can use this for events that must reach every administrator.
 */
export async function notifyAdmins(activity: AdminActivity): Promise<void> {
  try {
    const admins = await db
      .select({ id: usersTable.id, email: usersTable.email, username: usersTable.username })
      .from(usersTable)
      .where(or(eq(usersTable.isAdmin, true), eq(usersTable.isSuperAdmin, true))!);

    const deliveries = await Promise.allSettled(
      admins.map(async (admin) => {
        await createNotification(
          admin.id,
          "admin_activity",
          activity.title,
          activity.message,
          activity.metadata,
          true,
        );
        if (admin.email) {
          const delivered = await emailNotification({
            email: admin.email,
            username: admin.username,
            title: activity.title,
            message: activity.message,
            linkUrl: activity.linkUrl,
            linkText: "Review in Admin Panel",
          });
          if (!delivered) {
            throw new Error(`Email delivery failed for admin ${admin.id}`);
          }
        }
      }),
    );
    deliveries.forEach((delivery, index) => {
      if (delivery.status === "rejected") {
        logger.error(
          { err: delivery.reason, adminId: admins[index]?.id, title: activity.title },
          "Admin activity delivery failed",
        );
      }
    });
  } catch (error) {
    logger.error({ err: error, title: activity.title }, "Failed to notify admins");
  }
}