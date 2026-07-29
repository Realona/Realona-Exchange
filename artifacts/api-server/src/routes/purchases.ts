import { Router, type IRouter } from "express";
import { db, tradesTable, listingsTable, usersTable, tradeRatingsTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// GET /purchases — completed trades where current user was the buyer
router.get("/purchases", requireAuth, async (req, res): Promise<void> => {
  const { search, from, to } = req.query as Record<string, string>;

  let query = db
    .select({
      trade: tradesTable,
      listing: listingsTable,
      sellerUsername: usersTable.username,
      ratingGiven: tradeRatingsTable.rating,
    })
    .from(tradesTable)
    .leftJoin(listingsTable, eq(tradesTable.listingId, listingsTable.id))
    .leftJoin(usersTable, eq(tradesTable.sellerId, usersTable.id))
    .leftJoin(
      tradeRatingsTable,
      and(
        eq(tradeRatingsTable.tradeId, tradesTable.id),
        eq(tradeRatingsTable.raterId, tradesTable.buyerId)
      )
    )
    .$dynamic();

  const conditions = [
    eq(tradesTable.buyerId, req.userId!),
    eq(tradesTable.status, "completed"),
  ];

  if (search) {
    conditions.push(sql`${listingsTable.gameName} ILIKE ${'%' + search + '%'}`);
  }
  if (from) {
    conditions.push(gte(tradesTable.createdAt, new Date(from)));
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    conditions.push(lte(tradesTable.createdAt, toDate));
  }

  const rows = await query.where(and(...conditions)).orderBy(sql`${tradesTable.createdAt} DESC`);

  const purchases = rows.map((r) => {
    const listing = r.listing;
    return {
      tradeId: r.trade.id,
      listingId: r.trade.listingId,
      gameName: listing?.gameName ?? null,
      pictureUrl: listing?.pictureUrl ?? null,
      category: listing?.category ?? "efootball",
      konamiId: listing?.konamiId ?? null,
      konamiPassword: listing?.konamiPassword ?? null,
      accessCode: listing?.accessCode ?? null,
      sellerUsername: r.sellerUsername ?? null,
      amount: Number(r.trade.amount),
      fee: Number(r.trade.fee),
      status: r.trade.status,
      ratingGiven: r.ratingGiven ?? null,
      purchasedAt: r.trade.updatedAt,
      createdAt: r.trade.createdAt,
    };
  });

  res.json(purchases);
});

export default router;
