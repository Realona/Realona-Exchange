import { Router, type IRouter, type Request } from "express";
import { db, depositsTable, usersTable, virtualAccountsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? "RealonaWebhook2026SecureKey123456789";

router.post("/webhooks/flutterwave", async (req, res): Promise<void> => {
  const signature = req.headers["verif-hash"] as string;

  if (!signature || signature !== WEBHOOK_SECRET) {
    req.log.warn("Invalid webhook signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body;
  req.log.info({ event: event.event }, "Flutterwave webhook received");

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const data = event.data;
    const accountNumber = data.virtual_account?.account_number;
    const amount = Number(data.amount);
    const reference = data.tx_ref ?? data.flw_ref ?? `FLW-${Date.now()}`;
    const flwRef = data.flw_ref;

    if (!accountNumber || !amount) {
      res.json({ success: true });
      return;
    }

    // Find the virtual account
    const [va] = await db
      .select()
      .from(virtualAccountsTable)
      .where(eq(virtualAccountsTable.accountNumber, accountNumber));

    if (!va) {
      req.log.warn({ accountNumber }, "Virtual account not found");
      res.json({ success: true });
      return;
    }

    // Check for duplicate deposit
    const [existingDeposit] = await db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.reference, reference));

    if (existingDeposit) {
      req.log.info({ reference }, "Duplicate deposit webhook, skipping");
      res.json({ success: true });
      return;
    }

    // Credit user wallet
    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${amount}`,
    }).where(eq(usersTable.id, va.userId));

    // Record deposit
    await db.insert(depositsTable).values({
      userId: va.userId,
      amount: String(amount),
      reference,
      flwRef,
      status: "completed",
    });

    req.log.info({ userId: va.userId, amount }, "Wallet credited via webhook");
  }

  res.json({ success: true });
});

export default router;
