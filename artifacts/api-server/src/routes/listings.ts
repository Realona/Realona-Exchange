import { Router, type IRouter } from "express";
import { db, listingsTable, usersTable, wishlistTable, platformConfigTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateListingBody, UpdateListingBody, GetListingParams, UpdateListingParams, DeleteListingParams, GetListingsQueryParams, CreateBulkListingsBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notifier";

const router: IRouter = Router();

function parseHighlightedPlayers(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function formatListing(listing: typeof listingsTable.$inferSelect & { highlighted_players?: string | null }, sellerUsername?: string | null, extras?: { sellerIsVerified?: boolean; sellerRating?: number | null }) {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    sellerUsername: sellerUsername ?? null,
    sellerIsVerified: extras?.sellerIsVerified ?? false,
    sellerRating: extras?.sellerRating ?? null,
    category: listing.category ?? "efootball",
    gameName: listing.gameName,
    price: Number(listing.price),
    description: listing.description,
    pictureUrl: listing.pictureUrl ?? null,
    accountEmail: listing.accountEmail ?? null,
    accountPassword: listing.accountPassword ?? null,
    divisionRank: listing.divisionRank ?? null,
    squadRating: listing.squadRating ?? null,
    platform: listing.platform ?? null,
    accountHandle: listing.accountHandle ?? null,
    followerCount: listing.followerCount ?? null,
    following: listing.following ?? null,
    accountAge: listing.accountAge ?? null,
    engagementRate: listing.engagementRate ?? null,
    highlightedPlayers: parseHighlightedPlayers((listing as any).highlightedPlayers ?? null),
    viewCount: listing.viewCount ?? 0,
    status: listing.status,
    createdAt: listing.createdAt,
  };
}

router.get("/listings", async (req, res): Promise<void> => {
  const params = GetListingsQueryParams.safeParse(req.query);
  const q = params.success ? params.data : {};

  let query = db
    .select({
      listing: listingsTable,
      sellerUsername: usersTable.username,
      sellerIsVerified: usersTable.isVerified,
    })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .$dynamic();

  const conditions = [eq(listingsTable.status, "active")];
  if (q.search) conditions.push(or(ilike(listingsTable.gameName, `%${q.search}%`), ilike(listingsTable.description, `%${q.search}%`))!);
  if (q.game) conditions.push(ilike(listingsTable.gameName, `%${q.game}%`));
  if (q.minPrice !== undefined) conditions.push(gte(sql`${listingsTable.price}::numeric`, sql`${q.minPrice}`));
  if (q.maxPrice !== undefined) conditions.push(lte(sql`${listingsTable.price}::numeric`, sql`${q.maxPrice}`));
  if (q.divisionRank) conditions.push(eq(listingsTable.divisionRank, q.divisionRank));
  if (q.minSquadRating !== undefined) conditions.push(gte(listingsTable.squadRating, q.minSquadRating));
  if (q.maxSquadRating !== undefined) conditions.push(lte(listingsTable.squadRating, q.maxSquadRating));

  const rows = await query.where(and(...conditions)).orderBy(sql`${listingsTable.createdAt} DESC`);

  res.json(rows.map(r => formatListing(r.listing, r.sellerUsername, { sellerIsVerified: r.sellerIsVerified ?? false })));
});

router.post("/listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [listing] = await db
    .insert(listingsTable)
    .values({
      sellerId: req.userId!,
      category: d.category ?? "efootball",
      gameName: d.gameName,
      price: String(d.price),
      description: d.description,
      pictureUrl: d.pictureUrl ?? null,
      accountEmail: d.accountEmail ?? null,
      accountPassword: d.accountPassword ?? null,
      konamiId: d.konamiId ?? null,
      konamiPassword: d.konamiPassword ?? null,
      accessCode: d.accessCode ?? null,
      divisionRank: d.divisionRank ?? null,
      squadRating: d.squadRating ?? null,
      platform: d.platform ?? null,
      accountHandle: d.accountHandle ?? null,
      followerCount: d.followerCount ?? null,
      following: d.following ?? null,
      accountAge: d.accountAge ?? null,
      engagementRate: d.engagementRate ?? null,
      highlightedPlayers: d.highlightedPlayers ? JSON.stringify(d.highlightedPlayers) : null,
    })
    .returning();

  const [seller] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json(formatListing(listing, seller?.username));
});

router.post("/listings/bulk", requireAuth, async (req, res): Promise<void> => {
  // Load platform settings
  const configs = await db.select().from(platformConfigTable).where(
    sql`${platformConfigTable.key} IN ('bulk_listing_enabled', 'bulk_listing_max_images', 'bulk_listing_min_price')`
  );
  const cfg = Object.fromEntries(configs.map(c => [c.key, c.value]));

  if (cfg["bulk_listing_enabled"] === "false") {
    res.status(403).json({ error: "Bulk listing is currently disabled" });
    return;
  }

  const maxImages = parseInt(cfg["bulk_listing_max_images"] ?? "10", 10);
  const minPrice = parseFloat(cfg["bulk_listing_min_price"] ?? "1000");

  const parsed = CreateBulkListingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const items = parsed.data.items;

  if (items.length > maxImages) {
    res.status(400).json({ error: `Maximum ${maxImages} listings per batch` });
    return;
  }

  // Check for duplicate Konami IDs within the batch
  const konamiIds = items.map(i => i.konamiId).filter(Boolean);
  if (new Set(konamiIds).size !== konamiIds.length) {
    res.status(400).json({ error: "Duplicate Konami IDs found in this batch" });
    return;
  }

  const createdListings: (typeof listingsTable.$inferSelect)[] = [];
  const errorDetails: { index: number; message: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.price < minPrice) {
      errorDetails.push({ index: i, message: `Price must be at least ₦${minPrice.toLocaleString()}` });
      continue;
    }
    try {
      const [listing] = await db.insert(listingsTable).values({
        sellerId: req.userId!,
        category: item.category ?? "efootball",
        gameName: item.gameName,
        price: String(item.price),
        description: item.description,
        pictureUrl: item.pictureUrl ?? null,
        accountEmail: item.accountEmail ?? null,
        accountPassword: item.accountPassword ?? null,
        konamiId: item.konamiId ?? null,
        konamiPassword: item.konamiPassword ?? null,
        accessCode: item.accessCode ?? null,
        divisionRank: item.divisionRank ?? null,
        squadRating: item.squadRating ?? null,
        platform: item.platform ?? null,
        accountHandle: item.accountHandle ?? null,
        followerCount: item.followerCount ?? null,
        following: item.following ?? null,
        accountAge: item.accountAge ?? null,
        engagementRate: item.engagementRate ?? null,
        highlightedPlayers: item.highlightedPlayers ? JSON.stringify(item.highlightedPlayers) : null,
      }).returning();
      createdListings.push(listing);
    } catch (err: any) {
      errorDetails.push({ index: i, message: err?.message ?? "Failed to create listing" });
    }
  }

  const [seller] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    created: createdListings.length,
    errors: errorDetails.length,
    total: items.length,
    listings: createdListings.map(l => formatListing(l, seller?.username)),
    errorDetails,
  });
});

router.get("/listings/my", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ listing: listingsTable, sellerUsername: usersTable.username, sellerIsVerified: usersTable.isVerified })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.sellerId, req.userId!))
    .orderBy(sql`${listingsTable.createdAt} DESC`);

  res.json(rows.map(r => formatListing(r.listing, r.sellerUsername, { sellerIsVerified: r.sellerIsVerified ?? false })));
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const params = GetListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ listing: listingsTable, sellerUsername: usersTable.username, sellerIsVerified: usersTable.isVerified })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.json(formatListing(row.listing, row.sellerUsername, { sellerIsVerified: row.sellerIsVerified ?? false }));
});

router.patch("/listings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (existing.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.gameName !== undefined) updateData.gameName = parsed.data.gameName;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.pictureUrl !== undefined) updateData.pictureUrl = parsed.data.pictureUrl;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [updated] = await db.update(listingsTable).set(updateData).where(eq(listingsTable.id, params.data.id)).returning();
  const [seller] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, updated.sellerId));

  // Price drop notification → all wishlist users
  if (parsed.data.price !== undefined && Number(parsed.data.price) < Number(existing.price)) {
    const newPrice = Number(parsed.data.price);
    const oldPrice = Number(existing.price);
    const wishers = await db.select({ userId: wishlistTable.userId }).from(wishlistTable).where(eq(wishlistTable.listingId, params.data.id));
    await Promise.all(
      wishers
        .filter(w => w.userId !== req.userId)
        .map(w =>
          createNotification(
            w.userId,
            "trade_update",
            "💰 Price Drop on Wishlisted Account!",
            `"${existing.gameName}" dropped from ₦${oldPrice.toLocaleString()} to ₦${newPrice.toLocaleString()}. Grab it before it's gone!`,
            { listingId: params.data.id }
          )
        )
    );
  }

  res.json(formatListing(updated, seller?.username));
});

router.delete("/listings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (existing.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db.update(listingsTable).set({ status: "deleted" }).where(eq(listingsTable.id, params.data.id));
  res.json({ success: true, message: "Listing deleted" });
});

export default router;
