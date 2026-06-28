import { Router, type IRouter } from "express";
import { db, withdrawalsTable, usersTable, tradesTable } from "@workspace/db";
import { eq, sql, and, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
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

  // Check no active trades
  const activeTrades = await db
    .select()
    .from(tradesTable)
    .where(
      and(
        or(eq(tradesTable.buyerId, req.userId!), eq(tradesTable.sellerId, req.userId!))!,
        sql`${tradesTable.status} IN ('pending', 'payment_confirmed', 'seller_transferred', 'disputed')`
      )!
    );

  if (activeTrades.length > 0) {
    res.status(400).json({ error: "Cannot withdraw while you have active trades. Complete all trades first." });
    return;
  }

  // Check sufficient balance
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (Number(user.walletBalance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
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
