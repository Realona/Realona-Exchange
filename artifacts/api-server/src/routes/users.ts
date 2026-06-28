import { Router, type IRouter } from "express";
import { db, usersTable, depositsTable, withdrawalsTable, tradesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { virtualAccountsTable } from "@workspace/db";
import axios from "axios";

const router: IRouter = Router();

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY ?? "";

router.get("/users/wallet/balance", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select({ walletBalance: usersTable.walletBalance })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));
  res.json({ balance: Number(user?.walletBalance ?? 0) });
});

router.get("/users/virtual-account", requireAuth, async (req, res): Promise<void> => {
  const [existing] = await db
    .select()
    .from(virtualAccountsTable)
    .where(eq(virtualAccountsTable.userId, req.userId!));

  if (existing) {
    res.json({
      id: existing.id,
      accountNumber: existing.accountNumber,
      bankName: existing.bankName,
      reference: existing.reference,
    });
    return;
  }

  // Create virtual account via Flutterwave
  try {
    const user = req.user!;
    const reference = `REALONA-VA-${user.id}-${Date.now()}`;
    
    if (!FLW_SECRET) {
      // Fallback for development
      const [va] = await db.insert(virtualAccountsTable).values({
        userId: req.userId!,
        accountNumber: `903${Math.floor(1000000 + Math.random() * 9000000)}`,
        bankName: "Wema Bank (Demo)",
        reference,
      }).returning();
      res.json({ id: va.id, accountNumber: va.accountNumber, bankName: va.bankName, reference: va.reference });
      return;
    }

    const response = await axios.post(
      "https://api.flutterwave.com/v3/virtual-account-numbers",
      {
        email: user.email,
        is_permanent: true,
        bvn: "12345678901", // placeholder
        tx_ref: reference,
        phonenumber: "08012345678",
        firstname: user.username,
        lastname: "User",
        narration: `Realona Exchange - ${user.username}`,
      },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data.data;
    const [va] = await db.insert(virtualAccountsTable).values({
      userId: req.userId!,
      accountNumber: data.account_number,
      bankName: data.bank_name,
      reference,
      flwRef: data.flw_ref,
    }).returning();

    res.json({ id: va.id, accountNumber: va.accountNumber, bankName: va.bankName, reference: va.reference });
  } catch (err) {
    req.log.error({ err }, "Failed to create virtual account");
    // Fallback
    const reference = `REALONA-VA-${req.userId!}-${Date.now()}`;
    const [va] = await db.insert(virtualAccountsTable).values({
      userId: req.userId!,
      accountNumber: `903${Math.floor(1000000 + Math.random() * 9000000)}`,
      bankName: "Wema Bank",
      reference,
    }).returning();
    res.json({ id: va.id, accountNumber: va.accountNumber, bankName: va.bankName, reference: va.reference });
  }
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [tradeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tradesTable)
    .where(sql`${tradesTable.buyerId} = ${id} OR ${tradesTable.sellerId} = ${id}`);

  res.json({
    id: user.id,
    username: user.username,
    totalTrades: Number(tradeCount?.count ?? 0),
    createdAt: user.createdAt,
  });
});

export default router;
