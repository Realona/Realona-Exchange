import { Router, type IRouter } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatAnnouncement(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    priority: a.priority,
    isActive: a.isActive,
    createdAt: a.createdAt,
  };
}

// Get active announcements (public)
router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(items.map(formatAnnouncement));
});

export default router;
