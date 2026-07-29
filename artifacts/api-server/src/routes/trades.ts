import { Router, type IRouter } from "express";
import { db, tradesTable, listingsTable, usersTable, tradeMessagesTable, platformConfigTable, tradeRatingsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  emailTradeCreated, emailPaymentConfirmed, emailSellerTransferred,
  emailTradeCompleted, emailDisputeOpened,
} from "../lib/email";
import {
  CreateTradeBody,
  GetTradeParams,
  ConfirmTradePaymentParams,
  SellerTransferredParams,
  ConfirmReceiptParams,
  OpenDisputeParams,
  OpenDisputeBody,
} from "@workspace/api-zod";
import { createNotification } from "../lib/notifier";

const router: IRouter = Router();

async function getPlatformFee(): Promise<number> {
  const [config] = await db.select().from(platformConfigTable).where(eq(platformConfigTable.key, "fee_percent"));
  return Number(config?.value ?? "2.5");
}

async function addSystemMessage(tradeId: number, message: string) {
  const SYSTEM_USER_ID = 0;
  await db.insert(tradeMessagesTable).values({
    tradeId,
    senderId: SYSTEM_USER_ID,
    message,
    isSystem: true,
  }).catch(() => {
    // ignore if system user doesn't exist - use a valid user
  });
}

async function addSystemMsg(tradeId: number, message: string, userId: number) {
  await db.insert(tradeMessagesTable).values({
    tradeId,
    senderId: userId,
    message,
    isSystem: true,
  });
}

function formatTrade(
  trade: typeof tradesTable.$inferSelect,
  extras: { buyerUsername?: string | null; sellerUsername?: string | null; gameName?: string | null; pictureUrl?: string | null }
) {
  return {
    id: trade.id,
    listingId: trade.listingId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    buyerUsername: extras.buyerUsername ?? null,
    sellerUsername: extras.sellerUsername ?? null,
    gameName: extras.gameName ?? null,
    pictureUrl: extras.pictureUrl ?? null,
    amount: Number(trade.amount),
    fee: Number(trade.fee),
    status: trade.status,
    disputeReason: trade.disputeReason ?? null,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

async function getTradeWithDetails(tradeId: number) {
  const [row] = await db
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
    .where(eq(tradesTable.id, tradeId));
  return row;
}

router.get("/trades", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
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
    .where(or(eq(tradesTable.buyerId, req.userId!), eq(tradesTable.sellerId, req.userId!))!)
    .orderBy(sql`${tradesTable.createdAt} DESC`);

  res.json(rows.map(r => formatTrade(r.trade, { buyerUsername: r.buyerUsername, sellerUsername: r.sellerUsername, gameName: r.gameName, pictureUrl: r.pictureUrl })));
});

router.post("/trades", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, parsed.data.listingId));
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.status !== "active") {
    res.status(400).json({ error: "Listing is no longer available" });
    return;
  }
  if (listing.sellerId === req.userId) {
    res.status(400).json({ error: "Cannot buy your own listing" });
    return;
  }

  const feePercent = await getPlatformFee();
  const amount = Number(listing.price);
  const fee = parseFloat((amount * feePercent / 100).toFixed(2));

  const [trade] = await db.insert(tradesTable).values({
    listingId: listing.id,
    buyerId: req.userId!,
    sellerId: listing.sellerId,
    amount: String(amount),
    fee: String(fee),
    status: "pending",
  }).returning();

  // Add system message
  await addSystemMsg(trade.id, `Trade #${trade.id} created. Buyer must confirm payment to proceed.`, req.userId!);

  const row = await getTradeWithDetails(trade.id);

  // Email seller about new trade
  const [seller] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, listing.sellerId));
  const [buyer] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (seller && buyer) {
    emailTradeCreated({
      sellerEmail: seller.email, sellerUsername: row.sellerUsername ?? "",
      buyerUsername: buyer.username, gameName: listing.gameName,
      amount, tradeId: trade.id,
    }).catch(() => {});
  }

  res.status(201).json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

router.get("/trades/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTradeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const row = await getTradeWithDetails(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (row.trade.buyerId !== req.userId && row.trade.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  res.json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

router.post("/trades/:id/confirm-payment", requireAuth, async (req, res): Promise<void> => {
  const params = ConfirmTradePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }
  if (trade.buyerId !== req.userId) {
    res.status(403).json({ error: "Only buyer can confirm payment" });
    return;
  }
  if (trade.status !== "pending") {
    res.status(400).json({ error: "Trade is not in pending state" });
    return;
  }

  // Check buyer has enough balance
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (Number(buyer.walletBalance) < Number(trade.amount)) {
    res.status(400).json({ error: "Insufficient wallet balance. Please deposit funds first." });
    return;
  }

  // Deduct from buyer wallet (held in escrow)
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} - ${trade.amount}`,
  }).where(eq(usersTable.id, req.userId!));

  await db.update(tradesTable).set({ status: "payment_confirmed" }).where(eq(tradesTable.id, params.data.id));
  await addSystemMsg(params.data.id, "Payment confirmed by buyer. Seller should now transfer the game account.", req.userId!);

  const row = await getTradeWithDetails(params.data.id);

  // Email seller to transfer account
  const [sellerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.sellerId));
  if (sellerUser) {
    emailPaymentConfirmed({
      sellerEmail: sellerUser.email, sellerUsername: row.sellerUsername ?? "",
      buyerUsername: row.buyerUsername ?? "", gameName: row.gameName ?? "",
      amount: Number(trade.amount), tradeId: trade.id,
    }).catch(() => {});
  }

  res.json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

router.post("/trades/:id/seller-transferred", requireAuth, async (req, res): Promise<void> => {
  const params = SellerTransferredParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }
  if (trade.sellerId !== req.userId) {
    res.status(403).json({ error: "Only seller can mark as transferred" });
    return;
  }
  if (trade.status !== "payment_confirmed") {
    res.status(400).json({ error: "Trade is not in payment confirmed state" });
    return;
  }

  await db.update(tradesTable).set({ status: "seller_transferred" }).where(eq(tradesTable.id, params.data.id));
  await addSystemMsg(params.data.id, "Seller has transferred the account. Buyer should confirm receipt.", req.userId!);

  const row = await getTradeWithDetails(params.data.id);

  // Email buyer to confirm receipt
  const [buyerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.buyerId));
  if (buyerUser) {
    emailSellerTransferred({
      buyerEmail: buyerUser.email, buyerUsername: row.buyerUsername ?? "",
      sellerUsername: row.sellerUsername ?? "", gameName: row.gameName ?? "",
      tradeId: trade.id,
    }).catch(() => {});
  }

  res.json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

router.post("/trades/:id/confirm-receipt", requireAuth, async (req, res): Promise<void> => {
  const params = ConfirmReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }
  if (trade.buyerId !== req.userId) {
    res.status(403).json({ error: "Only buyer can confirm receipt" });
    return;
  }
  if (trade.status !== "seller_transferred") {
    res.status(400).json({ error: "Trade is not in seller transferred state" });
    return;
  }

  // Release funds to seller (amount minus platform fee)
  const sellerAmount = Number(trade.amount) - Number(trade.fee);
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} + ${sellerAmount}`,
  }).where(eq(usersTable.id, trade.sellerId));

  // Mark listing as sold
  await db.update(listingsTable).set({ status: "sold" }).where(eq(listingsTable.id, trade.listingId));

  await db.update(tradesTable).set({ status: "completed" }).where(eq(tradesTable.id, params.data.id));
  await addSystemMsg(params.data.id, `Trade completed! Seller received ₦${sellerAmount.toLocaleString()}. Platform fee: ₦${Number(trade.fee).toLocaleString()}.`, req.userId!);

  const row = await getTradeWithDetails(params.data.id);

  // Email both parties
  const [sellerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.sellerId));
  const [buyerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.buyerId));
  if (sellerUser && buyerUser) {
    emailTradeCompleted({
      sellerEmail: sellerUser.email, sellerUsername: row.sellerUsername ?? "",
      buyerEmail: buyerUser.email, buyerUsername: row.buyerUsername ?? "",
      gameName: row.gameName ?? "", sellerAmount, tradeId: trade.id,
    }).catch(() => {});
  }

  res.json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

router.post("/trades/:id/dispute", requireAuth, async (req, res): Promise<void> => {
  const params = OpenDisputeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const parsed = OpenDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const allowedStatuses = ["payment_confirmed", "seller_transferred"];
  if (!allowedStatuses.includes(trade.status)) {
    res.status(400).json({ error: "Cannot open dispute in current trade status" });
    return;
  }

  await db.update(tradesTable).set({
    status: "disputed",
    disputeReason: parsed.data.reason,
  }).where(eq(tradesTable.id, params.data.id));

  await addSystemMsg(params.data.id, `Dispute opened: ${parsed.data.reason}. Admin will review this trade.`, req.userId!);

  const row = await getTradeWithDetails(params.data.id);

  // Email admin + both parties
  const [sellerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.sellerId));
  const [buyerUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, trade.buyerId));
  const adminEmail = process.env.EMAIL_FROM ?? "realonabusinessexchange@gmail.com";
  const isOpenerBuyer = req.userId === trade.buyerId;
  if (sellerUser && buyerUser) {
    emailDisputeOpened({
      adminEmail,
      buyerUsername: row.buyerUsername ?? "", sellerUsername: row.sellerUsername ?? "",
      gameName: row.gameName ?? "", reason: parsed.data.reason, tradeId: trade.id,
      openerEmail: isOpenerBuyer ? buyerUser.email : sellerUser.email,
      openerUsername: isOpenerBuyer ? (row.buyerUsername ?? "") : (row.sellerUsername ?? ""),
      otherEmail: isOpenerBuyer ? sellerUser.email : buyerUser.email,
      otherUsername: isOpenerBuyer ? (row.sellerUsername ?? "") : (row.buyerUsername ?? ""),
    }).catch(() => {});
  }

  res.json(formatTrade(row.trade, { buyerUsername: row.buyerUsername, sellerUsername: row.sellerUsername, gameName: row.gameName, pictureUrl: row.pictureUrl }));
});

// Cancel a pending trade (buyer or seller)
router.post("/trades/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const tradeId = parseInt(req.params.id as string);
  if (isNaN(tradeId)) { res.status(400).json({ error: "Invalid trade ID" }); return; }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, tradeId));
  if (!trade) { res.status(404).json({ error: "Trade not found" }); return; }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId) {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  if (trade.status !== "pending") {
    res.status(400).json({ error: "Only pending trades can be cancelled" }); return;
  }

  await db.update(tradesTable).set({ status: "cancelled" }).where(eq(tradesTable.id, tradeId));
  // Restore listing to active
  await db.update(listingsTable).set({ status: "active" }).where(eq(listingsTable.id, trade.listingId));
  await addSystemMsg(tradeId, "Trade has been cancelled. The listing is now available again.", req.userId!);

  // Notify the other party
  const otherId = trade.buyerId === req.userId ? trade.sellerId : trade.buyerId;
  const [me] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  await createNotification(otherId, "trade_update", "Trade Cancelled", `Trade #${tradeId} was cancelled by ${me?.username ?? "the other party"}.`, { tradeId });

  res.json({ success: true });
});

// Get revealed credentials (buyer only, after payment_confirmed)
router.get("/trades/:id/credentials", requireAuth, async (req, res): Promise<void> => {
  const tradeId = parseInt(req.params.id as string);
  if (isNaN(tradeId)) { res.status(400).json({ error: "Invalid trade ID" }); return; }

  const row = await getTradeWithDetails(tradeId);
  if (!row) { res.status(404).json({ error: "Trade not found" }); return; }
  if (row.trade.buyerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Only the buyer or admin can view credentials" }); return;
  }
  const allowedStatuses = ["payment_confirmed", "seller_transferred", "completed"];
  if (!allowedStatuses.includes(row.trade.status)) {
    res.status(403).json({ error: "Credentials are only revealed after payment is confirmed" }); return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, row.trade.listingId));
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  res.json({
    konamiId: listing.konamiId ?? null,
    konamiPassword: listing.konamiPassword ?? null,
    accessCode: listing.accessCode ?? null,
    accountEmail: listing.accountEmail ?? null,
    accountPassword: listing.accountPassword ?? null,
  });
});

// Buyer confirms they have accessed the account
router.post("/trades/:id/confirm-access", requireAuth, async (req, res): Promise<void> => {
  const tradeId = parseInt(req.params.id as string);
  if (isNaN(tradeId)) { res.status(400).json({ error: "Invalid trade ID" }); return; }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, tradeId));
  if (!trade) { res.status(404).json({ error: "Trade not found" }); return; }
  if (trade.buyerId !== req.userId) { res.status(403).json({ error: "Only the buyer can confirm access" }); return; }

  const allowedStatuses = ["payment_confirmed", "seller_transferred"];
  if (!allowedStatuses.includes(trade.status)) {
    res.status(400).json({ error: "Cannot confirm access at this trade stage" }); return;
  }

  // Release funds to seller
  const sellerAmount = Number(trade.amount) - Number(trade.fee);
  await db.update(usersTable).set({
    walletBalance: sql`${usersTable.walletBalance} + ${sellerAmount}`,
  }).where(eq(usersTable.id, trade.sellerId));

  await db.update(listingsTable).set({ status: "sold" }).where(eq(listingsTable.id, trade.listingId));
  await db.update(tradesTable).set({ status: "completed", accessConfirmed: true }).where(eq(tradesTable.id, tradeId));
  await addSystemMsg(tradeId, `Buyer confirmed account access! Trade #${tradeId} is now complete. Seller received ₦${sellerAmount.toLocaleString()}.`, req.userId!);

  // Notify seller
  const [buyer] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  await createNotification(trade.sellerId, "trade_update", "Trade Completed!", `${buyer?.username ?? "Buyer"} confirmed account access. ₦${sellerAmount.toLocaleString()} has been released to your wallet.`, { tradeId });

  res.json({ success: true });
});

// Submit a rating for the trade partner
router.post("/trades/:id/rate", requireAuth, async (req, res): Promise<void> => {
  const tradeId = parseInt(req.params.id as string);
  if (isNaN(tradeId)) { res.status(400).json({ error: "Invalid trade ID" }); return; }

  const { rating, comment } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" }); return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, tradeId));
  if (!trade) { res.status(404).json({ error: "Trade not found" }); return; }
  if (trade.status !== "completed") { res.status(400).json({ error: "Can only rate completed trades" }); return; }

  const isBuyer = trade.buyerId === req.userId;
  const isSeller = trade.sellerId === req.userId;
  if (!isBuyer && !isSeller) { res.status(403).json({ error: "Not a participant in this trade" }); return; }

  const rateeId = isBuyer ? trade.sellerId : trade.buyerId;

  // Check duplicate
  const [existing] = await db.select().from(tradeRatingsTable)
    .where(and(eq(tradeRatingsTable.tradeId, tradeId), eq(tradeRatingsTable.raterId, req.userId!)));
  if (existing) { res.status(400).json({ error: "You have already rated this trade" }); return; }

  await db.insert(tradeRatingsTable).values({
    tradeId,
    raterId: req.userId!,
    rateeId,
    rating,
    comment: comment ?? null,
  });

  // Notify ratee
  const [rater] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  await createNotification(rateeId, "trade_rated", "New Rating Received", `${rater?.username ?? "A user"} gave you ${rating} star${rating !== 1 ? "s" : ""} on Trade #${tradeId}.`, { tradeId, rating });

  res.json({ success: true });
});

export default router;
