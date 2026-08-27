import { Router, type IRouter } from "express";
import { db, offersTable, listingsTable, usersTable } from "@workspace/db";
import { eq, and, sql, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notifier";
import { notifyAdmins } from "../lib/adminNotifier";

const router: IRouter = Router();

function formatOffer(offer: typeof offersTable.$inferSelect, extras: { buyerUsername?: string | null; sellerUsername?: string | null; listingTitle?: string | null }) {
  return {
    id: offer.id,
    listingId: offer.listingId,
    buyerId: offer.buyerId,
    sellerId: offer.sellerId,
    buyerUsername: extras.buyerUsername ?? null,
    sellerUsername: extras.sellerUsername ?? null,
    listingTitle: extras.listingTitle ?? null,
    amount: Number(offer.amount),
    counterAmount: offer.counterAmount ? Number(offer.counterAmount) : null,
    message: offer.message ?? null,
    status: offer.status,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
  };
}

// Make an offer on a listing
router.post("/listings/:id/offers", requireAuth, async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.id as string);
  if (isNaN(listingId)) { res.status(400).json({ error: "Invalid listing ID" }); return; }

  const { amount, message } = req.body;
  if (!amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Valid offer amount is required" }); return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing.status !== "active") { res.status(400).json({ error: "Listing is not available" }); return; }
  if (listing.sellerId === req.userId) { res.status(400).json({ error: "Cannot make an offer on your own listing" }); return; }

  // Check for existing active offer from this buyer on this listing
  const [existing] = await db.select().from(offersTable)
    .where(and(eq(offersTable.listingId, listingId), eq(offersTable.buyerId, req.userId!), eq(offersTable.status, "pending")));
  if (existing) { res.status(400).json({ error: "You already have a pending offer on this listing" }); return; }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const [offer] = await db.insert(offersTable).values({
    listingId,
    buyerId: req.userId!,
    sellerId: listing.sellerId,
    amount: String(amount),
    message: message ?? null,
    status: "pending",
    expiresAt,
  }).returning();

  // Notify seller
  const [buyer] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  await notifyAdmins({
    title: "New offer submitted",
    message: `${buyer?.username ?? "A buyer"} offered ₦${amount.toLocaleString()} on ${listing.gameName}.`,
    linkUrl: "/admin",
    metadata: { offerId: offer.id, listingId, linkUrl: "/admin" },
  });
  await createNotification(
    listing.sellerId,
    "offer_received",
    "New Offer Received",
    `${buyer?.username ?? "A buyer"} made an offer of ₦${amount.toLocaleString()} on "${listing.gameName}"`,
    { offerId: offer.id, listingId }
  );

  res.status(201).json(formatOffer(offer, { listingTitle: listing.gameName }));
});

// Get my offers (as buyer or seller)
router.get("/offers", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      offer: offersTable,
      buyerUsername: sql<string>`buyer.username`,
      sellerUsername: sql<string>`seller.username`,
      gameName: listingsTable.gameName,
    })
    .from(offersTable)
    .leftJoin(sql`users AS buyer`, sql`${offersTable.buyerId} = buyer.id`)
    .leftJoin(sql`users AS seller`, sql`${offersTable.sellerId} = seller.id`)
    .leftJoin(listingsTable, eq(offersTable.listingId, listingsTable.id))
    .where(or(eq(offersTable.buyerId, req.userId!), eq(offersTable.sellerId, req.userId!)))
    .orderBy(sql`${offersTable.createdAt} DESC`);

  res.json(rows.map(r => formatOffer(r.offer, { buyerUsername: r.buyerUsername, sellerUsername: r.sellerUsername, listingTitle: r.gameName })));
});

// Respond to an offer (accept / reject / counter)
router.post("/offers/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const offerId = parseInt(req.params.id as string);
  if (isNaN(offerId)) { res.status(400).json({ error: "Invalid offer ID" }); return; }

  const { action, counterAmount } = req.body;
  if (!["accept", "reject", "counter"].includes(action)) {
    res.status(400).json({ error: "action must be accept, reject, or counter" }); return;
  }
  if (action === "counter" && (!counterAmount || typeof counterAmount !== "number")) {
    res.status(400).json({ error: "counterAmount is required for counter action" }); return;
  }

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  // When pending → seller responds; when countered → buyer responds (their turn to react)
  const expectedResponder = offer.status === "countered" ? offer.buyerId : offer.sellerId;
  if (expectedResponder !== req.userId) {
    const msg = offer.status === "countered"
      ? "It is the buyer's turn to respond to this counter offer"
      : "Only the seller can respond to this offer";
    res.status(403).json({ error: msg }); return;
  }
  if (offer.status !== "pending" && offer.status !== "countered") { res.status(400).json({ error: "Offer is no longer active" }); return; }

  let newStatus: string;
  let updateData: Record<string, unknown> = {};
  if (action === "accept") { newStatus = "accepted"; }
  else if (action === "reject") { newStatus = "rejected"; }
  else { newStatus = "countered"; updateData.counterAmount = String(counterAmount); }

  const [updatedOffer] = await db
    .update(offersTable)
    .set({ status: newStatus, ...updateData })
    .where(and(eq(offersTable.id, offerId), eq(offersTable.status, offer.status)))
    .returning({ id: offersTable.id });
  if (!updatedOffer) {
    res.status(409).json({ error: "This offer has already been updated" });
    return;
  }

  // Notify buyer
  const [listing] = await db.select({ gameName: listingsTable.gameName }).from(listingsTable).where(eq(listingsTable.id, offer.listingId));
  const [responder] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  const responderRole = offer.status === "countered" ? "Buyer" : "Seller";
  const actionText = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "countered";
  await notifyAdmins({
    title: `Offer ${actionText}`,
    message: `${responderRole} ${responder?.username ?? `#${req.userId}`} ${actionText} offer #${offerId} on ${listing?.gameName ?? "a listing"}.`,
    linkUrl: "/admin",
    metadata: { offerId, listingId: offer.listingId, linkUrl: "/admin" },
  });
  await createNotification(
    offer.buyerId,
    "offer_responded",
    `Offer ${actionText}`,
    `${responder?.username ?? responderRole} ${actionText} your offer on "${listing?.gameName ?? "listing"}"`,
    { offerId, listingId: offer.listingId }
  );

  res.json({ success: true });
});

export default router;
