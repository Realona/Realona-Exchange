import { Router, type IRouter } from "express";
import { db, platformReviewsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notifier";
const router: IRouter = Router();

// Get all platform reviews (public)
router.get("/reviews", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: platformReviewsTable.id,
      rating: platformReviewsTable.rating,
      review: platformReviewsTable.review,
      adminResponse: platformReviewsTable.adminResponse,
      createdAt: platformReviewsTable.createdAt,
      username: usersTable.username,
      isVerified: usersTable.isVerified,
    })
    .from(platformReviewsTable)
    .leftJoin(usersTable, eq(platformReviewsTable.userId, usersTable.id))
    .orderBy(sql`${platformReviewsTable.createdAt} DESC`)
    .limit(50);

  const avgRating = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length
    : 0;

  res.json({
    reviews: rows,
    averageRating: parseFloat(avgRating.toFixed(1)),
    totalCount: rows.length,
  });
});

// Create a review (authenticated)
router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const { rating, review } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1–5" }); return; }
  if (!review || typeof review !== "string" || review.length < 10 || review.length > 1000) { res.status(400).json({ error: "Review must be 10–1000 characters" }); return; }
  const parsed = { data: { rating: rating as number, review: review as string } };

  // Allow one review per user (check if exists)
  const [existing] = await db.select().from(platformReviewsTable).where(eq(platformReviewsTable.userId, req.userId!));
  if (existing) {
    // Update existing
    const [updatedReview] = await db.update(platformReviewsTable)
      .set({ rating: parsed.data.rating, review: parsed.data.review })
      .where(eq(platformReviewsTable.userId, req.userId!))
      .returning();
    res.json(updatedReview);
    return;
  }

  const [newReview] = await db.insert(platformReviewsTable).values({
    userId: req.userId!,
    rating: parsed.data.rating,
    review: parsed.data.review,
  }).returning();

  res.status(201).json(review);
});

// Admin: respond to a review
router.post("/reviews/:id/respond", requireAuth, async (req, res): Promise<void> => {
  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) { res.status(403).json({ error: "Admins only" }); return; }
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const response = typeof req.body?.response === "string" ? req.body.response.trim() : "";
  if (!response || response.length > 1000) {
    res.status(400).json({ error: "Response must be between 1 and 1000 characters" });
    return;
  }

  const [updated] = await db.update(platformReviewsTable)
    .set({ adminResponse: response as string })
    .where(eq(platformReviewsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
  createNotification(
    updated.userId,
    "review_response",
    "Realona responded to your review",
    "An admin has posted an official response to your platform review.",
    { linkUrl: "/reviews" },
  ).catch(() => {});
  res.json(updated);
});

export default router;
