import { Router, type IRouter } from "express";
import { db, withdrawalsTable, usersTable, tradesTable } from "@workspace/db";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { emailWithdrawalRequested } from "../lib/email";
import { RequestWithdrawalBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatWithdrawal(w: typeof withdrawalsTable.$inferSelect, username?: string | null) {
  return {
    id: w.id,
    userId: w.userId,
    username: username ?? null,
    amount: Number(w.amount),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    rejectionReason: w.rejectionReason ?? null,
    createdAt: w.createdAt,
  };
}

router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ withdrawal: withdrawalsTable, username: usersTable.username })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.userId, req.userId!))
    .orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  res.json(rows.map(r => formatWithdrawal(r.withdrawal, r.username)));
});

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const parsed = RequestWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, bankName, accountNumber, accountName } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "Amount must be greater than zero" });
    return;
  }

  // Block withdrawal if user has any active trade in progress
  const activeTradeStatuses = ["payment_confirmed", "seller_transferred", "disputed"];
  const [activeTrade] = await db
    .select({ id: tradesTable.id, status: tradesTable.status })
    .from(tradesTable)
    .where(and(
      or(eq(tradesTable.buyerId, req.userId!), eq(tradesTable.sellerId, req.userId!)),
      inArray(tradesTable.status, activeTradeStatuses)
    ))
    .limit(1);
  if (activeTrade) {
    res.status(400).json({ error: `You have an active trade (#${activeTrade.id}) in progress. You cannot withdraw until the trade is complete.` });
    return;
  }

  // Compute escrowed amount: pending buyer trades where buyer hasn't yet confirmed payment
  // (payment_confirmed+ already have wallet deducted, so they don't reduce available balance again)
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const pendingBuyerTrades = await db
    .select({ amount: tradesTable.amount })
    .from(tradesTable)
    .where(and(eq(tradesTable.buyerId, req.userId!), eq(tradesTable.status, "pending")));
  const escrowedAmount = pendingBuyerTrades.reduce((sum, t) => sum + Number(t.amount), 0);
  const availableBalance = Number(user.walletBalance) - escrowedAmount;

  if (amount > availableBalance) {
    const msg = escrowedAmount > 0
      ? `₦${escrowedAmount.toLocaleString()} is held for a pending trade. You can withdraw up to ₦${Math.max(0, availableBalance).toLocaleString()}.`
      : "Insufficient wallet balance";
    res.status(400).json({ error: msg });
    return;
  }

  // Deduct balance
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} - ${amount}`,
  }).where(eq(usersTable.id, req.userId!));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId: req.userId!,
    amount: String(amount),
    bankName,
    accountNumber,
    accountName,
    status: "pending",
  }).returning();

  res.status(201).json(formatWithdrawal(withdrawal, user.username));
});

export default router;
