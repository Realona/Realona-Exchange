import { Router, type IRouter } from "express";
import { db, reportsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateReportBody } from "@workspace/api-zod";
import { notifyAdmins } from "../lib/adminNotifier";

const router: IRouter = Router();

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reported] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.reportedId));
  if (!reported) {
    res.status(404).json({ error: "Reported user not found" });
    return;
  }

  if (parsed.data.reportedId === req.userId) {
    res.status(400).json({ error: "Cannot report yourself" });
    return;
  }

  const [report] = await db.insert(reportsTable).values({
    reporterId: req.userId!,
    reportedId: parsed.data.reportedId,
    tradeId: parsed.data.tradeId ?? null,
    reason: parsed.data.reason,
    evidence: parsed.data.evidence ?? null,
    status: "pending",
  }).returning();

  const [reporter] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));
  await notifyAdmins({
    title: "New user report",
    message: `${reporter?.username ?? "A user"} submitted a report about ${reported.username}.`,
    linkUrl: "/admin/reports",
    metadata: { reportId: report.id, tradeId: report.tradeId, linkUrl: "/admin/reports" },
  });

  res.status(201).json({
    id: report.id,
    reporterId: report.reporterId,
    reporterUsername: reporter?.username ?? null,
    reportedId: report.reportedId,
    reportedUsername: reported.username,
    tradeId: report.tradeId ?? null,
    reason: report.reason,
    evidence: report.evidence ?? null,
    status: report.status,
    resolution: report.resolution ?? null,
    createdAt: report.createdAt,
  });
});

export default router;
