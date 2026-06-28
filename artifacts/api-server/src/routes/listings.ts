import { Router, type IRouter } from "express";
import { db, listingsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateListingBody, UpdateListingBody, GetListingParams, UpdateListingParams, DeleteListingParams, GetListingsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatListing(listing: typeof listingsTable.$inferSelect, sellerUsername?: string | null) {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    sellerUsername: sellerUsername ?? null,
    gameName: listing.gameName,
    price: Number(listing.price),
    description: listing.description,
    pictureUrl: listing.pictureUrl ?? null,
    accountEmail: listing.accountEmail ?? null,
    accountPassword: listing.accountPassword ?? null,
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
    })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .$dynamic();

  const conditions = [eq(listingsTable.status, "active")];
  if (q.search) conditions.push(or(ilike(listingsTable.gameName, `%${q.search}%`), ilike(listingsTable.description, `%${q.search}%`))!);
  if (q.game) conditions.push(ilike(listingsTable.gameName, `%${q.game}%`));
  if (q.minPrice !== undefined) conditions.push(gte(sql`${listingsTable.price}::numeric`, sql`${q.minPrice}`));
  if (q.maxPrice !== undefined) conditions.push(lte(sql`${listingsTable.price}::numeric`, sql`${q.maxPrice}`));

  const rows = await query.where(and(...conditions)).orderBy(sql`${listingsTable.createdAt} DESC`);

  res.json(rows.map(r => formatListing(r.listing, r.sellerUsername)));
});

router.post("/listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .insert(listingsTable)
    .values({
      sellerId: req.userId!,
      gameName: parsed.data.gameName,
      price: String(parsed.data.price),
      description: parsed.data.description,
      pictureUrl: parsed.data.pictureUrl ?? null,
      accountEmail: parsed.data.accountEmail ?? null,
      accountPassword: parsed.data.accountPassword ?? null,
    })
    .returning();

  const [seller] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json(formatListing(listing, seller?.username));
});

router.get("/listings/my", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ listing: listingsTable, sellerUsername: usersTable.username })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.sellerId, req.userId!))
    .orderBy(sql`${listingsTable.createdAt} DESC`);

  res.json(rows.map(r => formatListing(r.listing, r.sellerUsername)));
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const params = GetListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ listing: listingsTable, sellerUsername: usersTable.username })
    .from(listingsTable)
    .leftJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.json(formatListing(row.listing, row.sellerUsername));
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
