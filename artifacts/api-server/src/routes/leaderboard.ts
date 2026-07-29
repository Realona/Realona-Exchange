import { Router, type IRouter } from "express";
import { db, tradesTable, usersTable, tradeRatingsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  // Top 10 sellers by completed trades
  const topSellers = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.username,
      u.is_verified AS "isVerified",
      COUNT(t.id)::int AS count,
      ROUND(AVG(r.rating), 1) AS rating
    FROM trades t
    JOIN users u ON u.id = t.seller_id
    LEFT JOIN trade_ratings r ON r.ratee_id = t.seller_id
    WHERE t.status = 'completed'
    GROUP BY u.id, u.username, u.is_verified
    ORDER BY count DESC
    LIMIT 10
  `);

  // Top 10 buyers by completed trades
  const topBuyers = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.username,
      u.is_verified AS "isVerified",
      COUNT(t.id)::int AS count,
      ROUND(AVG(r.rating), 1) AS rating
    FROM trades t
    JOIN users u ON u.id = t.buyer_id
    LEFT JOIN trade_ratings r ON r.ratee_id = t.buyer_id
    WHERE t.status = 'completed'
    GROUP BY u.id, u.username, u.is_verified
    ORDER BY count DESC
    LIMIT 10
  `);

  // Most trusted by average rating (min 2 ratings)
  const mostTrusted = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.username,
      u.is_verified AS "isVerified",
      COUNT(r.id)::int AS count,
      ROUND(AVG(r.rating), 1) AS rating
    FROM trade_ratings r
    JOIN users u ON u.id = r.ratee_id
    GROUP BY u.id, u.username, u.is_verified
    HAVING COUNT(r.id) >= 1
    ORDER BY rating DESC, count DESC
    LIMIT 10
  `);

  // Newcomer of the Month: registered in last 30 days, most completed trades
  const newcomers = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.username,
      u.is_verified AS "isVerified",
      COUNT(t.id)::int AS count,
      ROUND(AVG(r.rating), 1) AS rating
    FROM users u
    LEFT JOIN trades t ON (t.buyer_id = u.id OR t.seller_id = u.id) AND t.status = 'completed'
    LEFT JOIN trade_ratings r ON r.ratee_id = u.id
    WHERE u.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY u.id, u.username, u.is_verified
    ORDER BY count DESC, u.created_at DESC
    LIMIT 10
  `);

  function addRanks(rows: any[]) {
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  res.json({
    topSellers: addRanks(topSellers.rows),
    topBuyers: addRanks(topBuyers.rows),
    mostTrusted: addRanks(mostTrusted.rows),
    newcomers: addRanks(newcomers.rows),
  });
});

export default router;
