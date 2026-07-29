import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Get my notifications
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const notes = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notes.map(n => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    metadata: n.metadata ?? null,
    createdAt: n.createdAt,
  })));
});

// Mark all as read
router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));
  res.json({ success: true });
});

// Mark single as read
router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid notification ID" }); return; }
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

export default router;
