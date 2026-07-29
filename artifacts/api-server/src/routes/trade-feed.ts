import { Router, type IRouter } from "express";
import { db, tradesTable, listingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

// Public anonymous feed of recent completed trades (no usernames or sensitive data)
router.get("/trades/feed", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: tradesTable.id,
      amount: tradesTable.amount,
      createdAt: tradesTable.createdAt,
      gameName: listingsTable.gameName,
      category: listingsTable.category,
      pictureUrl: listingsTable.pictureUrl,
      platform: listingsTable.platform,
    })
    .from(tradesTable)
    .leftJoin(listingsTable, eq(tradesTable.listingId, listingsTable.id))
    .where(eq(tradesTable.status, "completed"))
    .orderBy(sql`${tradesTable.createdAt} DESC`)
    .limit(12);

  res.json(rows.map(r => ({
    id: r.id,
    amount: Number(r.amount),
    createdAt: r.createdAt,
    gameName: r.gameName ?? "Account",
    category: (r as any).category ?? "efootball",
    pictureUrl: r.pictureUrl ?? null,
    platform: (r as any).platform ?? null,
  })));
});

export default router;
