import { Router, type IRouter } from "express";
import { db, giveawaysTable, giveawayClaimsTable, usersTable, listingsTable, tradesTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
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

// Claim a giveaway reward
router.post("/giveaways/:id/claim", requireAuth, async (req, res): Promise<void> => {
  const giveawayId = Number(req.params.id);
  if (isNaN(giveawayId)) { res.status(400).json({ error: "Invalid giveaway ID" }); return; }

  const [giveaway] = await db.select().from(giveawaysTable).where(eq(giveawaysTable.id, giveawayId));
  if (!giveaway) { res.status(404).json({ error: "Giveaway not found" }); return; }
  if (!giveaway.isActive) { res.status(400).json({ error: "This giveaway is no longer active" }); return; }
  if (giveaway.expiresAt && new Date() > giveaway.expiresAt) {
    res.status(400).json({ error: "This giveaway has expired" }); return;
  }
  if (giveaway.claimedCount >= giveaway.maxUsers) {
    res.status(400).json({ error: "All rewards have been claimed" }); return;
  }

  // Check user hasn't already claimed
  const [existing] = await db.select().from(giveawayClaimsTable)
    .where(and(eq(giveawayClaimsTable.giveawayId, giveawayId), eq(giveawayClaimsTable.userId, req.userId!)));
  if (existing) { res.status(400).json({ error: "You have already claimed this reward" }); return; }

  // Check task completion
  const userId = req.userId!;
  if (giveaway.taskType === "first_listing") {
    const [row] = await db.select({ cnt: count() }).from(listingsTable).where(eq(listingsTable.userId, userId));
    if (!row || row.cnt === 0) {
      res.status(400).json({ error: "You need to list at least one account to claim this reward" }); return;
    }
  } else if (giveaway.taskType === "first_trade") {
    const [row] = await db.select({ cnt: count() }).from(tradesTable)
      .where(and(eq(tradesTable.buyerId, userId), eq(tradesTable.status, "completed")));
    if (!row || row.cnt === 0) {
      res.status(400).json({ error: "You need to complete at least one trade to claim this reward" }); return;
    }
  }
  // registration task always passes; referral handled separately

  // Credit wallet, create claim, increment count — all in a transaction
  await db.transaction(async (tx) => {
    await tx.insert(giveawayClaimsTable).values({ giveawayId, userId });
    await tx.update(usersTable)
      .set({ walletBalance: sql`${usersTable.walletBalance} + ${giveaway.rewardAmount}` })
      .where(eq(usersTable.id, userId));
    await tx.update(giveawaysTable)
      .set({ claimedCount: sql`${giveawaysTable.claimedCount} + 1` })
      .where(eq(giveawaysTable.id, giveawayId));
  });

  await createNotification(userId, "giveaway_reward", `You earned ₦${Number(giveaway.rewardAmount).toLocaleString()} from "${giveaway.title}"! It has been added to your wallet.`);

  res.json({ success: true, amountCredited: Number(giveaway.rewardAmount) });
});

export default router;
