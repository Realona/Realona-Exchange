import { Router, type IRouter } from "express";
import { db, usersTable, tradesTable, depositsTable, withdrawalsTable, reportsTable, listingsTable, tradeMessagesTable, platformConfigTable } from "@workspace/db";
import { eq, sql, and, ilike, or } from "drizzle-orm";
import { requireAdmin, requireSuperAdmin } from "../lib/auth";
import {
  SuspendUserParams, SuspendUserBody,
  AdjustUserBalanceParams, AdjustUserBalanceBody,
  GetAdminUsersQueryParams, GetAdminTradesQueryParams, GetAdminWithdrawalsQueryParams,
  ForceCompleteTradeParams, RefundBuyerParams,
  ApproveWithdrawalParams, RejectWithdrawalParams, RejectWithdrawalBody,
  ResolveReportParams, ResolveReportBody,
  CreateAdminBody, UpdatePlatformFeeBody,
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
