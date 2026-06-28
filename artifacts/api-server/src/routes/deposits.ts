import { Router, type IRouter } from "express";
import { db, depositsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const deposits = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, req.userId!))
    .orderBy(sql`${depositsTable.createdAt} DESC`);

  res.json(deposits.map(d => ({
    id: d.id,
    userId: d.userId,
    amount: Number(d.amount),
    reference: d.reference,
    status: d.status,
    createdAt: d.createdAt,
  })));
});

export default router;
