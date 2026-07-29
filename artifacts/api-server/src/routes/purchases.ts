import { Router, type IRouter } from "express";
import { db, tradesTable, listingsTable, usersTable, tradeRatingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/purchases", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      trade: tradesTable,
      listing: listingsTable,
      sellerUsername: usersTable.username,
      rating: tradeRatingsTable.rating,
      ratingComment: tradeRatingsTable.comment,
    })
    .from(tradesTable)
    .leftJoin(listingsTable, eq(tradesTable.listingId, listingsTable.id))
    .leftJoin(usersTable, eq(tradesTable.sellerId, usersTable.id))
    .leftJoin(
      tradeRatingsTable,
      and(eq(tradeRatingsTable.tradeId, tradesTable.id), eq(tradeRatingsTable.raterId, req.userId!))
    )
    .where(and(eq(tradesTable.buyerId, req.userId!), eq(tradesTable.status, "completed")))
    .orderBy(sql`${tradesTable.createdAt} DESC`);

  res.json(rows.map(r => ({
    id: r.trade.id,
    listingId: r.trade.listingId,
    gameName: r.listing?.gameName ?? "Unknown Account",
    amount: Number(r.trade.amount),
    fee: r.trade.fee ? Number(r.trade.fee) : null,
    status: r.trade.status,
    createdAt: r.trade.createdAt,
    sellerId: r.trade.sellerId,
    sellerUsername: r.sellerUsername ?? null,
    pictureUrl: r.listing?.pictureUrl ?? null,
    category: (r.listing as any)?.category ?? "efootball",
    platform: (r.listing as any)?.platform ?? null,
    myRating: r.rating ?? null,
    ratingComment: r.ratingComment ?? null,
  })));
});

export default router;
