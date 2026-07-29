import { Router, type IRouter } from "express";
import { db, wishlistTable, listingsTable, usersTable, tradeRatingsTable, tradesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notifier";

const router: IRouter = Router();

function formatItem(item: typeof wishlistTable.$inferSelect, listing?: any) {
  return {
    id: item.id,
    userId: item.userId,
    listingId: item.listingId,
    listing: listing ?? null,
    createdAt: item.createdAt,
  };
}

// Public wishlist by username (no auth)
router.get("/wishlist/public/:username", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db.select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.username, username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rows = await db
    .select({
      item: wishlistTable,
      listing: listingsTable,
      sellerUsername: usersTable.username,
    })
    .from(wishlistTable)
    .leftJoin(listingsTable, eq(wishlistTable.listingId, listingsTable.id))
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(wishlistTable.userId, user.id))
    .orderBy(sql`${wishlistTable.createdAt} DESC`);

  res.json({
    username: user.username,
    items: rows.map(r => ({
      id: r.item.id,
      userId: r.item.userId,
      listingId: r.item.listingId,
      createdAt: r.item.createdAt,
      listing: r.listing ? {
        id: r.listing.id,
        gameName: r.listing.gameName,
        description: r.listing.description,
        price: Number(r.listing.price),
        pictureUrl: r.listing.pictureUrl ?? null,
        status: r.listing.status,
        category: (r.listing as any).category ?? "efootball",
        platform: (r.listing as any).platform ?? null,
        followerCount: (r.listing as any).followerCount ?? null,
        divisionRank: r.listing.divisionRank ?? null,
        squadRating: r.listing.squadRating ?? null,
        sellerUsername: r.sellerUsername ?? null,
      } : null,
    })),
  });
});

// Get wishlist
router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      item: wishlistTable,
      listing: listingsTable,
      sellerUsername: usersTable.username,
    })
    .from(wishlistTable)
    .leftJoin(listingsTable, eq(wishlistTable.listingId, listingsTable.id))
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(wishlistTable.userId, req.userId!))
    .orderBy(sql`${wishlistTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.item.id,
    userId: r.item.userId,
    listingId: r.item.listingId,
    createdAt: r.item.createdAt,
    listing: r.listing ? {
      id: r.listing.id,
      gameName: r.listing.gameName,
      description: r.listing.description,
      price: Number(r.listing.price),
      pictureUrl: r.listing.pictureUrl ?? null,
      status: r.listing.status,
      category: r.listing.category ?? "efootball",
      platform: r.listing.platform ?? null,
      followerCount: r.listing.followerCount ?? null,
      divisionRank: r.listing.divisionRank ?? null,
      squadRating: r.listing.squadRating ?? null,
      sellerUsername: r.sellerUsername ?? null,
    } : null,
  })));
});

// Add to wishlist
router.post("/wishlist/:listingId", requireAuth, async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.listingId as string);
  if (isNaN(listingId)) { res.status(400).json({ error: "Invalid listing ID" }); return; }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  // Check if already wishlisted
  const [existing] = await db.select().from(wishlistTable)
    .where(and(eq(wishlistTable.userId, req.userId!), eq(wishlistTable.listingId, listingId)));
  if (existing) { res.status(409).json({ error: "Already in wishlist" }); return; }

  const [item] = await db.insert(wishlistTable).values({
    userId: req.userId!,
    listingId,
  }).returning();

  res.status(201).json(formatItem(item));
});

// Remove from wishlist
router.delete("/wishlist/:listingId", requireAuth, async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.listingId as string);
  if (isNaN(listingId)) { res.status(400).json({ error: "Invalid listing ID" }); return; }

  await db.delete(wishlistTable)
    .where(and(eq(wishlistTable.userId, req.userId!), eq(wishlistTable.listingId, listingId)));

  res.json({ success: true });
});

export default router;
