import { Router, type IRouter } from "express";
import { db, tradeMessagesTable, tradesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  GetTradeMessagesParams,
  SendTradeMessageParams,
  SendTradeMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/trades/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = GetTradeMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  // Verify user is part of the trade or admin
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const rows = await db
    .select({
      message: tradeMessagesTable,
      senderUsername: usersTable.username,
    })
    .from(tradeMessagesTable)
    .leftJoin(usersTable, eq(tradeMessagesTable.senderId, usersTable.id))
    .where(eq(tradeMessagesTable.tradeId, params.data.id))
    .orderBy(tradeMessagesTable.createdAt);

  res.json(rows.map(r => ({
    id: r.message.id,
    tradeId: r.message.tradeId,
    senderId: r.message.senderId,
    senderUsername: r.senderUsername ?? (r.message.isSystem ? "System" : "Unknown"),
    message: r.message.message,
    isSystem: r.message.isSystem,
    createdAt: r.message.createdAt,
  })));
});

router.post("/trades/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendTradeMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const parsed = SendTradeMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const [msg] = await db.insert(tradeMessagesTable).values({
    tradeId: params.data.id,
    senderId: req.userId!,
    message: parsed.data.message,
    isSystem: false,
  }).returning();

  const [sender] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    id: msg.id,
    tradeId: msg.tradeId,
    senderId: msg.senderId,
    senderUsername: sender?.username ?? null,
    message: msg.message,
    isSystem: msg.isSystem,
    createdAt: msg.createdAt,
  });
});

export default router;
