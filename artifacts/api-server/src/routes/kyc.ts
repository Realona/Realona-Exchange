import { Router, type IRouter } from "express";
import { db, kycSubmissionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { isOwnedUploadPath } from "../lib/ownedUpload";

const router: IRouter = Router();

function formatKyc(k: typeof kycSubmissionsTable.$inferSelect, username?: string | null) {
  return {
    id: k.id,
    userId: k.userId,
    username: username ?? null,
    documentType: k.documentType,
    documentUrl: k.documentUrl,
    selfieUrl: k.selfieUrl ?? null,
    status: k.status,
    level: k.level,
    adminNote: k.adminNote ?? null,
    createdAt: k.createdAt,
  };
}

// Submit KYC documents
router.post("/kyc/submit", requireAuth, async (req, res): Promise<void> => {
  const { documentType, documentUrl, selfieUrl } = req.body;
  if (!documentType || !documentUrl) {
    res.status(400).json({ error: "documentType and documentUrl are required" }); return;
  }
  if (!isOwnedUploadPath(documentUrl, req.userId!) || !isOwnedUploadPath(selfieUrl, req.userId!)) {
    res.status(400).json({ error: "KYC documents must be uploaded from your account" });
    return;
  }

  // Check if user already has an approved KYC
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (user.kycLevel >= 1) {
    res.status(400).json({ error: "You are already verified" }); return;
  }

  // Check for pending submission
  const [existing] = await db.select().from(kycSubmissionsTable)
    .where(eq(kycSubmissionsTable.userId, req.userId!));
  if (existing && existing.status === "pending") {
    res.status(400).json({ error: "You already have a pending KYC submission" }); return;
  }

  const level = selfieUrl ? 2 : 1;

  const [submission] = await db.insert(kycSubmissionsTable).values({
    userId: req.userId!,
    documentType,
    documentUrl,
    selfieUrl: selfieUrl ?? null,
    status: "pending",
    level,
  }).returning();

  res.status(201).json(formatKyc(submission));
});

// Get my KYC status
router.get("/kyc/status", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [submission] = await db.select().from(kycSubmissionsTable)
    .where(eq(kycSubmissionsTable.userId, req.userId!));

  res.json({
    kycLevel: user.kycLevel,
    hasSubmission: !!submission,
    submission: submission ? formatKyc(submission) : null,
  });
});

export default router;
