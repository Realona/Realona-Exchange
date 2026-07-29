import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Public anonymous feed of recent completed trades (no usernames or sensitive data)
// Excludes trades where either party is a demo account
router.get("/trades/feed", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      t.id,
      t.amount,
      t.created_at AS "createdAt",
      l.game_name AS "gameName",
      l.category,
      l.picture_url AS "pictureUrl",
      l.platform
    FROM trades t
    LEFT JOIN listings l ON l.id = t.listing_id
    LEFT JOIN users buyer ON buyer.id = t.buyer_id
    LEFT JOIN users seller ON seller.id = t.seller_id
    WHERE t.status = 'completed'
      AND (buyer.is_demo IS NULL OR buyer.is_demo = false)
      AND (seller.is_demo IS NULL OR seller.is_demo = false)
    ORDER BY t.created_at DESC
    LIMIT 12
  `);

  res.json(rows.rows.map((r: any) => ({
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
