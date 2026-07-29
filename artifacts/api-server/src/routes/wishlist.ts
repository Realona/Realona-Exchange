import { Router, type IRouter } from "express";
import { db, wishlistItemsTable, listingsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
async function fetchWishlistRows(userId: number) {
  return db
    .select({
      wishlistItem: wishlistItemsTable,
      listing: listingsTable,
      sellerUsername: usersTable.username,
    })
    .from(wishlistItemsTable)
    .leftJoin(listingsTable, eq(wishlistItemsTable.listingId, listingsTable.id))
    .leftJoin(usersTable, sql`${listingsTable.sellerId} = ${usersTable.id}`)
    .where(eq(wishlistItemsTable.userId, userId))
    .orderBy(sql`${wishlistItemsTable.createdAt} DESC`);
}

function mapWishlistRow(r: Awaited<ReturnType<typeof fetchWishlistRows>>[number]) {
  const listing = r.listing;
  if (!listing) return null;
  let highlightedPlayers: string[] | null = null;
  try {
    highlightedPlayers = listing.highlightedPlayers
      ? JSON.parse(listing.highlightedPlayers)
      : null;
  } catch { /* ignore */ }
  return {
    wishlistId: r.wishlistItem.id,
    listingId: r.wishlistItem.listingId,
    addedAt: r.wishlistItem.createdAt,
    listing: {
      id: listing.id,
      sellerId: listing.sellerId,
      sellerUsername: r.sellerUsername ?? null,
      category: listing.category ?? "efootball",
      gameName: listing.gameName,
      price: Number(listing.price),
      description: listing.description,
      pictureUrl: listing.pictureUrl ?? null,
      divisionRank: listing.divisionRank ?? null,
      squadRating: listing.squadRating ?? null,
      platform: listing.platform ?? null,
      accountHandle: listing.accountHandle ?? null,
      followerCount: listing.followerCount ?? null,
      highlightedPlayers,
      status: listing.status,
      createdAt: listing.createdAt,
    },
  };
}

// ────────────────────────────────────────────────────────────
// GET /wishlist — current user's wishlist with full listing details
// ────────────────────────────────────────────────────────────
router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const rows = await fetchWishlistRows(req.userId!);
  res.json(rows.map(mapWishlistRow).filter(Boolean));
});

// ────────────────────────────────────────────────────────────
// GET /wishlist/ids — listing IDs wishlisted by the current user
// ────────────────────────────────────────────────────────────
router.get("/wishlist/ids", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ listingId: wishlistItemsTable.listingId })
    .from(wishlistItemsTable)
    .where(eq(wishlistItemsTable.userId, req.userId!));
  res.json(rows.map((r) => r.listingId));
});

// ────────────────────────────────────────────────────────────
// GET /wishlist/public/:username — public view (no auth)
// ────────────────────────────────────────────────────────────
router.get("/wishlist/public/:username", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rows = await fetchWishlistRows(user.id);
  res.json({
    username: user.username,
    items: rows.map(mapWishlistRow).filter(Boolean),
  });
});

// ────────────────────────────────────────────────────────────
// POST /wishlist/:listingId — add listing to wishlist
// ────────────────────────────────────────────────────────────
router.post("/wishlist/:listingId", requireAuth, async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.listingId as string);
  if (isNaN(listingId)) { res.status(400).json({ error: "Invalid listing ID" }); return; }

  const [listing] = await db
    .select({ id: listingsTable.id, sellerId: listingsTable.sellerId })
    .from(listingsTable)
    .where(eq(listingsTable.id, listingId));
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing.sellerId === req.userId) {
    res.status(400).json({ error: "Cannot wishlist your own listing" });
    return;
  }

  await db
    .insert(wishlistItemsTable)
    .values({ userId: req.userId!, listingId })
    .onConflictDoNothing();

  res.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// DELETE /wishlist/:listingId — remove from wishlist
// ────────────────────────────────────────────────────────────
router.delete("/wishlist/:listingId", requireAuth, async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.listingId as string);
  if (isNaN(listingId)) { res.status(400).json({ error: "Invalid listing ID" }); return; }

  await db
    .delete(wishlistItemsTable)
    .where(
      and(
        eq(wishlistItemsTable.userId, req.userId!),
        eq(wishlistItemsTable.listingId, listingId)
      )
    );

  res.json({ success: true });
});

export default router;
