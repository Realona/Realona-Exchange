import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  tradesTable,
  depositsTable,
  withdrawalsTable,
  reportsTable,
  listingsTable,
  tradeMessagesTable,
  platformConfigTable,
  kycSubmissionsTable,
  announcementsTable,
  giveawaysTable,
  giveawayClaimsTable,
  offersTable,
  notificationsTable,
  wishlistItemsTable,
  tradeRatingsTable,
  platformReviewsTable,
  virtualAccountsTable,
} from "@workspace/db";
import { eq, sql, and, ilike, or, inArray } from "drizzle-orm";
import { requireAdmin, requireSuperAdmin, hashPassword } from "../lib/auth";
import { emailWithdrawalApproved, emailWithdrawalRejected, emailVerifiedBadgeGranted, emailVerifiedBadgeRevoked } from "../lib/email";
import { createNotification } from "../lib/notifier";
import {
  SuspendUserParams, SuspendUserBody,
  AdjustUserBalanceParams, AdjustUserBalanceBody,
  VerifyTraderParams, VerifyTraderBody,
  GetAdminUsersQueryParams, GetAdminTradesQueryParams, GetAdminWithdrawalsQueryParams,
  ForceCompleteTradeParams, RefundBuyerParams,
  ApproveWithdrawalParams, RejectWithdrawalParams, RejectWithdrawalBody,
  ResolveReportParams, ResolveReportBody,
  CreateAdminBody, UpdatePlatformFeeBody, UpdateBulkListingSettingsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatAdminUser(user: typeof usersTable.$inferSelect, extras?: { totalDeposits?: number; totalWithdrawals?: number; totalTrades?: number }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    walletBalance: Number(user.walletBalance),
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
    isSuspended: user.isSuspended,
    isDemo: user.isDemo,
    isVerified: user.isVerified,
    totalDeposits: extras?.totalDeposits ?? 0,
    totalWithdrawals: extras?.totalWithdrawals ?? 0,
    totalTrades: extras?.totalTrades ?? 0,
    createdAt: user.createdAt,
  };
}

// Stats
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [tradeCount] = await db.select({ count: sql<number>`count(*)` }).from(tradesTable);
  const [depositSum] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(depositsTable).where(eq(depositsTable.status, "completed"));
  const [withdrawalSum] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "approved"));
  const [activeTrades] = await db.select({ count: sql<number>`count(*)` }).from(tradesTable).where(sql`${tradesTable.status} IN ('pending', 'payment_confirmed', 'seller_transferred')`);
  const [disputes] = await db.select({ count: sql<number>`count(*)` }).from(tradesTable).where(eq(tradesTable.status, "disputed"));
  const [escrow] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(tradesTable).where(sql`${tradesTable.status} IN ('payment_confirmed', 'seller_transferred', 'disputed')`);
  const [fees] = await db.select({ total: sql<number>`coalesce(sum(fee::numeric), 0)` }).from(tradesTable).where(eq(tradesTable.status, "completed"));
  const [pendingWith] = await db.select({ count: sql<number>`count(*)` }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));

  res.json({
    totalUsers: Number(userCount.count),
    totalTrades: Number(tradeCount.count),
    totalDeposits: Number(depositSum.total),
    totalWithdrawals: Number(withdrawalSum.total),
    activeTrades: Number(activeTrades.count),
    pendingDisputes: Number(disputes.count),
    escrowBalance: Number(escrow.total),
    platformEarnings: Number(fees.total),
    pendingWithdrawals: Number(pendingWith.count),
  });
});

// Users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminUsersQueryParams.safeParse(req.query);
  const q = params.success ? params.data : {};

  let query = db.select().from(usersTable).$dynamic();
  const conditions = [];
  if (q.search) conditions.push(or(ilike(usersTable.email, `%${q.search}%`), ilike(usersTable.username, `%${q.search}%`))!);
  if (q.suspended !== undefined) conditions.push(eq(usersTable.isSuspended, q.suspended));

  if (conditions.length > 0) query = query.where(and(...conditions));
  const users = await query.orderBy(sql`${usersTable.createdAt} DESC`);

  res.json(users.map(u => formatAdminUser(u)));
});

router.post("/admin/users/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const params = SuspendUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const parsed = SuspendUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ isSuspended: parsed.data.suspended })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatAdminUser(user));
});

router.post("/admin/users/:id/verify", requireSuperAdmin, async (req, res): Promise<void> => {
  const params = VerifyTraderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const parsed = VerifyTraderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ isVerified: parsed.data.verified })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Notify the seller (fire-and-forget — never block the response)
  if (parsed.data.verified) {
    createNotification(user.id, "giveaway", "🏅 Verified Trader Badge Granted", "Congratulations! You've been granted the Verified Trader badge. Your listings now appear in Verified Sellers filters.", {}).catch(() => {});
    emailVerifiedBadgeGranted({ email: user.email, username: user.username }).catch(() => {});
  } else {
    createNotification(user.id, "giveaway", "Verified Trader Badge Removed", "Your Verified Trader badge has been removed. Your listings remain active on the marketplace.", {}).catch(() => {});
    emailVerifiedBadgeRevoked({ email: user.email, username: user.username }).catch(() => {});
  }

  res.json(formatAdminUser(user));
});

router.post("/admin/users/:id/adjust-balance", requireAdmin, async (req, res): Promise<void> => {
  const params = AdjustUserBalanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const parsed = AdjustUserBalanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ walletBalance: sql`${usersTable.walletBalance} + ${parsed.data.amount}` })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatAdminUser(user));
});

// Trades
router.get("/admin/trades", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminTradesQueryParams.safeParse(req.query);
  const q = params.success ? params.data : {};

  let query = db
    .select({
      trade: tradesTable,
      buyerUsername: sql<string>`buyer.username`,
      sellerUsername: sql<string>`seller.username`,
      gameName: listingsTable.gameName,
      pictureUrl: listingsTable.pictureUrl,
    })
    .from(tradesTable)
    .leftJoin(sql`users AS buyer`, sql`${tradesTable.buyerId} = buyer.id`)
    .leftJoin(sql`users AS seller`, sql`${tradesTable.sellerId} = seller.id`)
    .leftJoin(listingsTable, eq(tradesTable.listingId, listingsTable.id))
    .$dynamic();

  if (q.status) {
    query = query.where(eq(tradesTable.status, q.status));
  }

  const rows = await query.orderBy(sql`${tradesTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.trade.id,
    listingId: r.trade.listingId,
    buyerId: r.trade.buyerId,
    sellerId: r.trade.sellerId,
    buyerUsername: r.buyerUsername ?? null,
    sellerUsername: r.sellerUsername ?? null,
    gameName: r.gameName ?? null,
    pictureUrl: r.pictureUrl ?? null,
    amount: Number(r.trade.amount),
    fee: Number(r.trade.fee),
    status: r.trade.status,
    disputeReason: r.trade.disputeReason ?? null,
    createdAt: r.trade.createdAt,
    updatedAt: r.trade.updatedAt,
  })));
});

router.post("/admin/trades/:id/force-complete", requireAdmin, async (req, res): Promise<void> => {
  const params = ForceCompleteTradeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  // Only force-complete disputed or seller_transferred trades
  const sellerAmount = Number(trade.amount) - Number(trade.fee);
  if (["payment_confirmed", "seller_transferred", "disputed"].includes(trade.status)) {
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${sellerAmount}`,
    }).where(eq(usersTable.id, trade.sellerId));
  }

  await db.update(listingsTable).set({ status: "sold" }).where(eq(listingsTable.id, trade.listingId));
  const [updated] = await db.update(tradesTable).set({ status: "completed" }).where(eq(tradesTable.id, params.data.id)).returning();

  await db.insert(tradeMessagesTable).values({
    tradeId: params.data.id,
    senderId: req.userId!,
    message: `Admin force-completed this trade. Seller received ₦${sellerAmount.toLocaleString()}.`,
    isSystem: true,
  });

  res.json({
    id: updated.id,
    listingId: updated.listingId,
    buyerId: updated.buyerId,
    sellerId: updated.sellerId,
    buyerUsername: null,
    sellerUsername: null,
    gameName: null,
    pictureUrl: null,
    amount: Number(updated.amount),
    fee: Number(updated.fee),
    status: updated.status,
    disputeReason: updated.disputeReason ?? null,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

router.post("/admin/trades/:id/refund-buyer", requireAdmin, async (req, res): Promise<void> => {
  const params = RefundBuyerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  // Return funds to buyer
  if (["payment_confirmed", "seller_transferred", "disputed"].includes(trade.status)) {
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${trade.amount}`,
    }).where(eq(usersTable.id, trade.buyerId));
  }

  const [updated] = await db.update(tradesTable).set({ status: "refunded" }).where(eq(tradesTable.id, params.data.id)).returning();

  await db.insert(tradeMessagesTable).values({
    tradeId: params.data.id,
    senderId: req.userId!,
    message: `Admin refunded ₦${Number(trade.amount).toLocaleString()} to buyer. Trade cancelled.`,
    isSystem: true,
  });

  res.json({
    id: updated.id,
    listingId: updated.listingId,
    buyerId: updated.buyerId,
    sellerId: updated.sellerId,
    buyerUsername: null,
    sellerUsername: null,
    gameName: null,
    pictureUrl: null,
    amount: Number(updated.amount),
    fee: Number(updated.fee),
    status: updated.status,
    disputeReason: updated.disputeReason ?? null,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

// Withdrawals
router.get("/admin/withdrawals", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminWithdrawalsQueryParams.safeParse(req.query);
  const q = params.success ? params.data : {};

  let query = db
    .select({ withdrawal: withdrawalsTable, username: usersTable.username })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .$dynamic();

  if (q.status) query = query.where(eq(withdrawalsTable.status, q.status));

  const rows = await query.orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.withdrawal.id,
    userId: r.withdrawal.userId,
    username: r.username ?? null,
    amount: Number(r.withdrawal.amount),
    bankName: r.withdrawal.bankName,
    accountNumber: r.withdrawal.accountNumber,
    accountName: r.withdrawal.accountName,
    status: r.withdrawal.status,
    rejectionReason: r.withdrawal.rejectionReason ?? null,
    createdAt: r.withdrawal.createdAt,
  })));
});

router.post("/admin/withdrawals/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid withdrawal ID" });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, params.data.id));
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (withdrawal.status !== "pending") {
    res.status(400).json({ error: "Withdrawal already processed" });
    return;
  }

  const [updated] = await db.update(withdrawalsTable).set({ status: "approved" }).where(eq(withdrawalsTable.id, params.data.id)).returning();
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, withdrawal.userId));

  res.json({
    id: updated.id,
    userId: updated.userId,
    username: user?.username ?? null,
    amount: Number(updated.amount),
    bankName: updated.bankName,
    accountNumber: updated.accountNumber,
    accountName: updated.accountName,
    status: updated.status,
    rejectionReason: updated.rejectionReason ?? null,
    createdAt: updated.createdAt,
  });
});

router.post("/admin/withdrawals/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = RejectWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid withdrawal ID" });
    return;
  }
  const parsed = RejectWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, params.data.id));
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  if (withdrawal.status !== "pending") {
    res.status(400).json({ error: "Withdrawal already processed" });
    return;
  }

  // Return funds to user on rejection
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} + ${withdrawal.amount}`,
  }).where(eq(usersTable.id, withdrawal.userId));

  const [updated] = await db.update(withdrawalsTable).set({
    status: "rejected",
    rejectionReason: parsed.data.reason,
  }).where(eq(withdrawalsTable.id, params.data.id)).returning();

  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, withdrawal.userId));

  res.json({
    id: updated.id,
    userId: updated.userId,
    username: user?.username ?? null,
    amount: Number(updated.amount),
    bankName: updated.bankName,
    accountNumber: updated.accountNumber,
    accountName: updated.accountName,
    status: updated.status,
    rejectionReason: updated.rejectionReason ?? null,
    createdAt: updated.createdAt,
  });
});

// Reports
router.get("/admin/reports", requireAdmin, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      report: reportsTable,
      reporterUsername: sql<string>`reporter.username`,
      reportedUsername: sql<string>`reported.username`,
    })
    .from(reportsTable)
    .leftJoin(sql`users AS reporter`, sql`${reportsTable.reporterId} = reporter.id`)
    .leftJoin(sql`users AS reported`, sql`${reportsTable.reportedId} = reported.id`)
    .orderBy(sql`${reportsTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.report.id,
    reporterId: r.report.reporterId,
    reporterUsername: r.reporterUsername ?? null,
    reportedId: r.report.reportedId,
    reportedUsername: r.reportedUsername ?? null,
    tradeId: r.report.tradeId ?? null,
    reason: r.report.reason,
    evidence: r.report.evidence ?? null,
    status: r.report.status,
    resolution: r.report.resolution ?? null,
    createdAt: r.report.createdAt,
  })));
});

router.post("/admin/reports/:id/resolve", requireAdmin, async (req, res): Promise<void> => {
  const params = ResolveReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }
  const parsed = ResolveReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(reportsTable).set({
    status: "resolved",
    resolution: parsed.data.resolution,
  }).where(eq(reportsTable.id, params.data.id)).returning();

  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json({
    id: updated.id,
    reporterId: updated.reporterId,
    reporterUsername: null,
    reportedId: updated.reportedId,
    reportedUsername: null,
    tradeId: updated.tradeId ?? null,
    reason: updated.reason,
    evidence: updated.evidence ?? null,
    status: updated.status,
    resolution: updated.resolution ?? null,
    createdAt: updated.createdAt,
  });
});

// ── Demo Accounts ───────────────────────────────────────────────────────────
router.get("/admin/demo-accounts", requireAdmin, async (req, res): Promise<void> => {
  const accounts = await db.select().from(usersTable).where(eq(usersTable.isDemo, true));
  res.json(accounts.map(u => formatAdminUser(u)));
});

router.post("/admin/demo-accounts", requireAdmin, async (req, res): Promise<void> => {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
  if (!username || username.length < 3) { res.status(400).json({ error: "Username must be at least 3 characters" }); return; }
  if (!email || !email.includes("@")) { res.status(400).json({ error: "Valid email required" }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.email, email), eq(usersTable.username, username)));
  if (existing.length > 0) { res.status(400).json({ error: "Email or username already taken" }); return; }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email,
    username,
    passwordHash,
    isDemo: true,
  }).returning();

  res.status(201).json(formatAdminUser(user));
});

router.delete("/admin/demo-accounts/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.isDemo, true)));
  if (!user) { res.status(404).json({ error: "Demo account not found" }); return; }

  try {
    const deleted = await db.transaction(async (tx) => {
      const ownedListings = await tx
        .select({ id: listingsTable.id })
        .from(listingsTable)
        .where(eq(listingsTable.sellerId, id));
      const listingIds = ownedListings.map((listing) => listing.id);

      const tradeCondition = listingIds.length > 0
        ? or(
            eq(tradesTable.buyerId, id),
            eq(tradesTable.sellerId, id),
            inArray(tradesTable.listingId, listingIds),
          )!
        : or(eq(tradesTable.buyerId, id), eq(tradesTable.sellerId, id))!;
      const relatedTrades = await tx
        .select({ id: tradesTable.id })
        .from(tradesTable)
        .where(tradeCondition);
      const tradeIds = relatedTrades.map((trade) => trade.id);

      if (tradeIds.length > 0) {
        await tx.delete(tradeMessagesTable).where(
          or(eq(tradeMessagesTable.senderId, id), inArray(tradeMessagesTable.tradeId, tradeIds))!,
        );
        await tx.delete(tradeRatingsTable).where(
          or(
            eq(tradeRatingsTable.raterId, id),
            eq(tradeRatingsTable.rateeId, id),
            inArray(tradeRatingsTable.tradeId, tradeIds),
          )!,
        );
        await tx.delete(reportsTable).where(
          or(
            eq(reportsTable.reporterId, id),
            eq(reportsTable.reportedId, id),
            inArray(reportsTable.tradeId, tradeIds),
          )!,
        );
      } else {
        await tx.delete(tradeMessagesTable).where(eq(tradeMessagesTable.senderId, id));
        await tx.delete(tradeRatingsTable).where(
          or(eq(tradeRatingsTable.raterId, id), eq(tradeRatingsTable.rateeId, id))!,
        );
        await tx.delete(reportsTable).where(
          or(eq(reportsTable.reporterId, id), eq(reportsTable.reportedId, id))!,
        );
      }

      if (listingIds.length > 0) {
        await tx.delete(wishlistItemsTable).where(
          or(eq(wishlistItemsTable.userId, id), inArray(wishlistItemsTable.listingId, listingIds))!,
        );
        await tx.delete(offersTable).where(
          or(
            eq(offersTable.buyerId, id),
            eq(offersTable.sellerId, id),
            inArray(offersTable.listingId, listingIds),
          )!,
        );
      } else {
        await tx.delete(wishlistItemsTable).where(eq(wishlistItemsTable.userId, id));
        await tx.delete(offersTable).where(
          or(eq(offersTable.buyerId, id), eq(offersTable.sellerId, id))!,
        );
      }

      await tx.delete(notificationsTable).where(eq(notificationsTable.userId, id));
      await tx.delete(depositsTable).where(eq(depositsTable.userId, id));
      await tx.delete(withdrawalsTable).where(eq(withdrawalsTable.userId, id));
      await tx.delete(kycSubmissionsTable).where(eq(kycSubmissionsTable.userId, id));
      await tx.delete(platformReviewsTable).where(eq(platformReviewsTable.userId, id));
      await tx.delete(virtualAccountsTable).where(eq(virtualAccountsTable.userId, id));

      const claims = await tx
        .select({ giveawayId: giveawayClaimsTable.giveawayId })
        .from(giveawayClaimsTable)
        .where(eq(giveawayClaimsTable.userId, id));
      await tx.delete(giveawayClaimsTable).where(eq(giveawayClaimsTable.userId, id));
      for (const giveawayId of new Set(claims.map((claim) => claim.giveawayId))) {
        const removedCount = claims.filter((claim) => claim.giveawayId === giveawayId).length;
        await tx
          .update(giveawaysTable)
          .set({ claimedCount: sql`GREATEST(0, ${giveawaysTable.claimedCount} - ${removedCount})` })
          .where(eq(giveawaysTable.id, giveawayId));
      }

      if (tradeIds.length > 0) {
        await tx.delete(tradesTable).where(inArray(tradesTable.id, tradeIds));
      }
      if (listingIds.length > 0) {
        await tx.delete(listingsTable).where(inArray(listingsTable.id, listingIds));
      }

      await tx.update(usersTable).set({ referredBy: null }).where(eq(usersTable.referredBy, id));
      const [removedUser] = await tx
        .delete(usersTable)
        .where(and(eq(usersTable.id, id), eq(usersTable.isDemo, true)))
        .returning({ id: usersTable.id });
      return removedUser;
    });

    if (!deleted) {
      res.status(409).json({ error: "Demo account could not be deleted. Please refresh and try again." });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[admin] failed to delete demo account", { userId: id, error });
    res.status(500).json({ error: "Could not delete the demo account and its related data. No changes were saved." });
  }
});

// Admin management (super admin only)
router.get("/admin/admins", requireAdmin, async (req, res): Promise<void> => {
  const admins = await db.select().from(usersTable).where(or(eq(usersTable.isAdmin, true), eq(usersTable.isSuperAdmin, true))!);
  res.json(admins.map(u => formatAdminUser(u)));
});

router.post("/admin/admins", requireSuperAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable).set({
    isAdmin: true,
    isSuperAdmin: parsed.data.isSuperAdmin ?? false,
  }).where(eq(usersTable.id, parsed.data.userId)).returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(201).json(formatAdminUser(user));
});

// ── Admin Deposits ──────────────────────────────────────────────────────────
router.get("/admin/deposits", requireAdmin, async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let query = db.select({
    deposit: depositsTable,
    username: usersTable.username,
  }).from(depositsTable)
    .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
    .$dynamic();
  if (status) query = query.where(eq(depositsTable.status, String(status))) as typeof query;
  const rows = await query.orderBy(sql`${depositsTable.createdAt} DESC`);
  res.json(rows.map(r => ({
    id: r.deposit.id,
    userId: r.deposit.userId,
    username: r.username,
    amount: Number(r.deposit.amount),
    reference: r.deposit.reference,
    status: r.deposit.status,
    createdAt: r.deposit.createdAt,
  })));
});

router.post("/admin/deposits/:id/confirm", requireAdmin, async (req, res): Promise<void> => {
  const depositId = parseInt(req.params.id as string);
  if (isNaN(depositId)) { res.status(400).json({ error: "Invalid deposit ID" }); return; }

  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId));
  if (!deposit) { res.status(404).json({ error: "Deposit not found" }); return; }
  if (deposit.status !== "pending") { res.status(400).json({ error: "Deposit is not pending" }); return; }

  const commission = 50;
  const credited = Number(deposit.amount) - commission;

  // Credit user
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} + ${credited}`,
  }).where(eq(usersTable.id, deposit.userId));

  // Credit admin commission
  const [admin] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, "realonabusinessexchange@gmail.com"));
  if (admin) {
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${commission}`,
    }).where(eq(usersTable.id, admin.id));
  }

  await db.update(depositsTable).set({ status: "completed" }).where(eq(depositsTable.id, depositId));
  res.json({ success: true });
});

// ── Admin KYC ────────────────────────────────────────────────────────────────
router.get("/admin/kyc", requireAdmin, async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let query = db.select({
    kyc: kycSubmissionsTable,
    username: usersTable.username,
  }).from(kycSubmissionsTable)
    .leftJoin(usersTable, eq(kycSubmissionsTable.userId, usersTable.id))
    .$dynamic();
  if (status) query = query.where(eq(kycSubmissionsTable.status, String(status))) as typeof query;
  const rows = await query.orderBy(sql`${kycSubmissionsTable.createdAt} DESC`);
  res.json(rows.map(r => ({
    id: r.kyc.id,
    userId: r.kyc.userId,
    username: r.username,
    documentType: r.kyc.documentType,
    documentUrl: r.kyc.documentUrl,
    selfieUrl: r.kyc.selfieUrl ?? null,
    status: r.kyc.status,
    level: r.kyc.level,
    adminNote: r.kyc.adminNote ?? null,
    createdAt: r.kyc.createdAt,
  })));
});

router.post("/admin/kyc/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [kyc] = await db.select().from(kycSubmissionsTable).where(eq(kycSubmissionsTable.id, id));
  if (!kyc) { res.status(404).json({ error: "KYC submission not found" }); return; }
  await db.update(kycSubmissionsTable).set({ status: "approved" }).where(eq(kycSubmissionsTable.id, id));
  await db.update(usersTable).set({ kycLevel: kyc.level }).where(eq(usersTable.id, kyc.userId));
  res.json({ success: true });
});

router.post("/admin/kyc/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { note } = req.body;
  const [kyc] = await db.select().from(kycSubmissionsTable).where(eq(kycSubmissionsTable.id, id));
  if (!kyc) { res.status(404).json({ error: "KYC submission not found" }); return; }
  await db.update(kycSubmissionsTable).set({ status: "rejected", adminNote: note ?? null }).where(eq(kycSubmissionsTable.id, id));
  res.json({ success: true });
});

// ── Admin Announcements ──────────────────────────────────────────────────────
router.get("/admin/announcements", requireAdmin, async (req, res): Promise<void> => {
  const items = await db.select().from(announcementsTable).orderBy(sql`${announcementsTable.createdAt} DESC`);
  res.json(items.map(a => ({ id: a.id, title: a.title, description: a.description, priority: a.priority, isActive: a.isActive, createdAt: a.createdAt })));
});

router.post("/admin/announcements", requireAdmin, async (req, res): Promise<void> => {
  const { title, description, priority } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description are required" }); return; }
  const [item] = await db.insert(announcementsTable).values({ title, description, priority: priority ?? "normal" }).returning();
  res.status(201).json({ id: item.id, title: item.title, description: item.description, priority: item.priority, isActive: item.isActive, createdAt: item.createdAt });
});

router.delete("/admin/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(announcementsTable).set({ isActive: false }).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

// ── Admin Giveaways ──────────────────────────────────────────────────────────
router.get("/admin/giveaways", requireAdmin, async (req, res): Promise<void> => {
  const items = await db.select().from(giveawaysTable).orderBy(sql`${giveawaysTable.createdAt} DESC`);
  res.json(items.map(g => ({
    id: g.id, title: g.title, description: g.description ?? null,
    rewardAmount: Number(g.rewardAmount), maxUsers: g.maxUsers,
    claimedCount: g.claimedCount, taskType: g.taskType, isActive: g.isActive,
    expiresAt: g.expiresAt ?? null, createdAt: g.createdAt, hasUserClaimed: false,
  })));
});

router.post("/admin/giveaways", requireAdmin, async (req, res): Promise<void> => {
  const { title, description, rewardAmount, maxUsers, taskType, isActive, expiresAt } = req.body;
  if (!title || !rewardAmount || !maxUsers || !taskType) {
    res.status(400).json({ error: "title, rewardAmount, maxUsers, taskType are required" }); return;
  }
  const [item] = await db.insert(giveawaysTable).values({
    title, description: description ?? null,
    rewardAmount: String(rewardAmount), maxUsers, taskType,
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json({
    id: item.id, title: item.title, description: item.description ?? null,
    rewardAmount: Number(item.rewardAmount), maxUsers: item.maxUsers,
    claimedCount: item.claimedCount, taskType: item.taskType, isActive: item.isActive,
    expiresAt: item.expiresAt ?? null, createdAt: item.createdAt, hasUserClaimed: false,
  });
});

router.patch("/admin/giveaways/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { isActive, title, description, rewardAmount, maxUsers, taskType, expiresAt } = req.body;
  const update: Record<string, unknown> = {};
  if (isActive !== undefined) update.isActive = isActive;
  if (title) update.title = title;
  if (description !== undefined) update.description = description;
  if (rewardAmount !== undefined) update.rewardAmount = String(rewardAmount);
  if (maxUsers !== undefined) update.maxUsers = maxUsers;
  if (taskType) update.taskType = taskType;
  if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;
  const [item] = await db.update(giveawaysTable).set(update).where(eq(giveawaysTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Giveaway not found" }); return; }
  res.json({
    id: item.id, title: item.title, description: item.description ?? null,
    rewardAmount: Number(item.rewardAmount), maxUsers: item.maxUsers,
    claimedCount: item.claimedCount, taskType: item.taskType, isActive: item.isActive,
    expiresAt: item.expiresAt ?? null, createdAt: item.createdAt, hasUserClaimed: false,
  });
});

// Bulk listing settings
router.get("/admin/bulk-listing-settings", requireSuperAdmin, async (req, res): Promise<void> => {
  const configs = await db.select().from(platformConfigTable).where(
    sql`${platformConfigTable.key} IN ('bulk_listing_enabled', 'bulk_listing_max_images', 'bulk_listing_min_price')`
  );
  const cfg = Object.fromEntries(configs.map(c => [c.key, c.value]));
  res.json({
    enabled: cfg["bulk_listing_enabled"] !== "false",
    maxImages: parseInt(cfg["bulk_listing_max_images"] ?? "10", 10),
    minPrice: parseFloat(cfg["bulk_listing_min_price"] ?? "1000"),
  });
});

router.patch("/admin/bulk-listing-settings", requireSuperAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateBulkListingSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { enabled, maxImages, minPrice } = parsed.data;
  if (enabled !== undefined) {
    await db.delete(platformConfigTable).where(eq(platformConfigTable.key, "bulk_listing_enabled"));
    await db.insert(platformConfigTable).values({ key: "bulk_listing_enabled", value: String(enabled) });
  }
  if (maxImages !== undefined) {
    await db.delete(platformConfigTable).where(eq(platformConfigTable.key, "bulk_listing_max_images"));
    await db.insert(platformConfigTable).values({ key: "bulk_listing_max_images", value: String(maxImages) });
  }
  if (minPrice !== undefined) {
    await db.delete(platformConfigTable).where(eq(platformConfigTable.key, "bulk_listing_min_price"));
    await db.insert(platformConfigTable).values({ key: "bulk_listing_min_price", value: String(minPrice) });
  }

  const configs = await db.select().from(platformConfigTable).where(
    sql`${platformConfigTable.key} IN ('bulk_listing_enabled', 'bulk_listing_max_images', 'bulk_listing_min_price')`
  );
  const cfg = Object.fromEntries(configs.map(c => [c.key, c.value]));
  res.json({
    enabled: cfg["bulk_listing_enabled"] !== "false",
    maxImages: parseInt(cfg["bulk_listing_max_images"] ?? "10", 10),
    minPrice: parseFloat(cfg["bulk_listing_min_price"] ?? "1000"),
  });
});

// Platform fee
router.get("/admin/fee", requireAdmin, async (req, res): Promise<void> => {
  const [config] = await db.select().from(platformConfigTable).where(eq(platformConfigTable.key, "fee_percent"));
  res.json({ feePercent: Number(config?.value ?? "2.5") });
});

router.patch("/admin/fee", requireSuperAdmin, async (req, res): Promise<void> => {
  const parsed = UpdatePlatformFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(platformConfigTable).where(eq(platformConfigTable.key, "fee_percent"));
  await db.insert(platformConfigTable).values({ key: "fee_percent", value: String(parsed.data.feePercent) });

  res.json({ feePercent: parsed.data.feePercent });
});

export default router;
