import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, listingsTable, tradesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const asNumber = (value: unknown): number => Number(value ?? 0);

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

router.get("/seller/analytics", requireAuth, async (req, res): Promise<void> => {
  const sellerId = req.userId!;
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

  const [listingTotals] = await db
    .select({
      totalViews: sql<string>`coalesce(sum(${listingsTable.viewCount}), 0)`,
    })
    .from(listingsTable)
    .where(eq(listingsTable.sellerId, sellerId));

  const [salesTotals] = await db
    .select({
      totalSales: sql<string>`count(*)`,
      averageSalePrice: sql<string>`coalesce(avg(${tradesTable.amount}::numeric), 0)`,
      totalEarned: sql<string>`coalesce(sum(${tradesTable.amount}::numeric - ${tradesTable.fee}::numeric), 0)`,
    })
    .from(tradesTable)
    .where(and(eq(tradesTable.sellerId, sellerId), eq(tradesTable.status, "completed")));

  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${tradesTable.createdAt}), 'YYYY-MM')`,
      sales: sql<string>`count(*)`,
      earnings: sql<string>`coalesce(sum(${tradesTable.amount}::numeric - ${tradesTable.fee}::numeric), 0)`,
    })
    .from(tradesTable)
    .where(
      and(
        eq(tradesTable.sellerId, sellerId),
        eq(tradesTable.status, "completed"),
        gte(tradesTable.createdAt, trendStart),
      ),
    )
    .groupBy(sql`date_trunc('month', ${tradesTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${tradesTable.createdAt})`);

  const monthlyMap = new Map(
    monthlyRows.map((row) => [
      row.month,
      {
        sales: asNumber(row.sales),
        earnings: asNumber(row.earnings),
      },
    ]),
  );

  const monthlySales = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth() + index, 1));
    const key = monthKey(month);
    const values = monthlyMap.get(key) ?? { sales: 0, earnings: 0 };
    return { month: key, ...values };
  });

  const listingRows = await db
    .select({
      listingId: listingsTable.id,
      gameName: listingsTable.gameName,
      views: sql<string>`coalesce(${listingsTable.viewCount}, 0)`,
      sales: sql<string>`count(${tradesTable.id}) filter (where ${tradesTable.status} = 'completed')`,
      earnings: sql<string>`coalesce(sum(case when ${tradesTable.status} = 'completed' then ${tradesTable.amount}::numeric - ${tradesTable.fee}::numeric else 0 end), 0)`,
    })
    .from(listingsTable)
    .leftJoin(
      tradesTable,
      and(eq(tradesTable.listingId, listingsTable.id), eq(tradesTable.sellerId, sellerId)),
    )
    .where(eq(listingsTable.sellerId, sellerId))
    .groupBy(listingsTable.id, listingsTable.gameName, listingsTable.viewCount)
    .orderBy(desc(sql`count(${tradesTable.id}) filter (where ${tradesTable.status} = 'completed')`), desc(listingsTable.viewCount))
    .limit(10);

  const totalViews = asNumber(listingTotals?.totalViews);
  const totalSales = asNumber(salesTotals?.totalSales);
  const thisMonthEarnings = monthlyMap.get(monthKey(currentMonth))?.earnings ?? 0;
  const lastMonthEarnings = monthlyMap.get(monthKey(previousMonth))?.earnings ?? 0;
  const growthRate = lastMonthEarnings > 0
    ? Number((((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100).toFixed(1))
    : thisMonthEarnings > 0 ? 100 : 0;

  res.json({
    totalViews,
    totalSales,
    averageSalePrice: asNumber(salesTotals?.averageSalePrice),
    conversionRate: totalViews > 0 ? Number(((totalSales / totalViews) * 100).toFixed(1)) : 0,
    totalEarned: asNumber(salesTotals?.totalEarned),
    thisMonthEarnings,
    lastMonthEarnings,
    growthRate,
    monthlySales,
    listingPerformance: listingRows.map((row) => {
      const views = asNumber(row.views);
      const sales = asNumber(row.sales);
      return {
        listingId: row.listingId,
        gameName: row.gameName,
        views,
        sales,
        earnings: asNumber(row.earnings),
        conversionRate: views > 0 ? Number(((sales / views) * 100).toFixed(1)) : 0,
      };
    }),
  });
});

export default router;