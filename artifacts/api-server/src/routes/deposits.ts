import { Router, type IRouter } from "express";
import { db, depositsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { notifyAdmins } from "../lib/adminNotifier";

const router: IRouter = Router();

function formatDeposit(d: typeof depositsTable.$inferSelect, username?: string | null) {
  return {
    id: d.id,
    userId: d.userId,
    username: username ?? null,
    amount: Number(d.amount),
    reference: d.reference,
    status: d.status,
    createdAt: d.createdAt,
  };
}

router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const deposits = await db
    .select({ deposit: depositsTable, username: usersTable.username })
    .from(depositsTable)
    .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
    .where(eq(depositsTable.userId, req.userId!))
    .orderBy(sql`${depositsTable.createdAt} DESC`);

  res.json(deposits.map(r => formatDeposit(r.deposit, r.username)));
});

// User submits a deposit request (creates pending record)
router.post("/deposits/request", requireAuth, async (req, res): Promise<void> => {
  const { amount } = req.body;
  const amt = Number(amount);
  if (!amt || isNaN(amt) || amt < 1050) {
    res.status(400).json({ error: "Minimum deposit is ₦1,050 (₦1,000 + ₦50 service charge)" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const reference = `DEP-${user.username}-${Date.now()}`;

  const [deposit] = await db.insert(depositsTable).values({
    userId: req.userId!,
    amount: String(amt),
    reference,
    status: "pending",
  }).returning();

  await notifyAdmins({
    title: "New deposit request",
    message: `${user.username} submitted a deposit of ₦${amt.toLocaleString()}. Reference: ${reference}. Please verify on Moniepoint and confirm.`,
    linkUrl: "/admin/deposits",
    metadata: { depositId: deposit.id, linkUrl: "/admin/deposits" },
  });

  res.status(201).json(formatDeposit(deposit, user.username));
});

export default router;
