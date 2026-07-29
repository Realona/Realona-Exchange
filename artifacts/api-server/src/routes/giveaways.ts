import { Router, type IRouter } from "express";
import { db, giveawaysTable, giveawayClaimsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notifier";

const router: IRouter = Router();

function formatGiveaway(g: typeof giveawaysTable.$inferSelect, hasUserClaimed = false) {
  return {
    id: g.id,
    title: g.title,
    description: g.description ?? null,
    rewardAmount: Number(g.rewardAmount),
    maxUsers: g.maxUsers,
    claimedCount: g.claimedCount,
    taskType: g.taskType,
    isActive: g.isActive,
    hasUserClaimed,
    expiresAt: g.expiresAt ?? null,
    createdAt: g.createdAt,
  };
}

// Get active giveaways (with user's claim status)
router.get("/giveaways", requireAuth, async (req, res): Promise<void> => {
  const giveaways = await db.select().from(giveawaysTable)
    .where(eq(giveawaysTable.isActive, true))
    .orderBy(sql`${giveawaysTable.createdAt} DESC`);

  const claimedIds = giveaways.length > 0
    ? await db.select({ giveawayId: giveawayClaimsTable.giveawayId })
        .from(giveawayClaimsTable)
        .where(eq(giveawayClaimsTable.userId, req.userId!))
    : [];

  const claimedSet = new Set(claimedIds.map(c => c.giveawayId));
  res.json(giveaways.map(g => formatGiveaway(g, claimedSet.has(g.id))));
});

export default router;
