import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGetPlatformReviews, useCreatePlatformReview } from "@workspace/api-client-react";
import { Star, ShieldCheck, MessageSquare, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/query-error-state";

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              (hover || value) >= s ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useGetPlatformReviews({ query: { queryKey: ["getPlatformReviews"] } });
  const createReview = useCreatePlatformReview();

  const handleSubmit = () => {
    if (!user) { toast({ title: "Please login to leave a review", variant: "destructive" }); return; }
    if (rating === 0) { toast({ title: "Please select a star rating", variant: "destructive" }); return; }
    if (reviewText.trim().length < 10) { toast({ title: "Review must be at least 10 characters", variant: "destructive" }); return; }

    setSubmitting(true);
    createReview.mutate({ data: { rating, review: reviewText.trim() } }, {
      onSuccess: () => {
        toast({ title: "Thank you for your review! ⭐" });
        setRating(0);
        setReviewText("");
        queryClient.invalidateQueries({ queryKey: ["getPlatformReviews"] });
        setSubmitting(false);
      },
      onError: () => {
        toast({ title: "Failed to submit review", variant: "destructive" });
        setSubmitting(false);
      },
    });
  };

  const reviews = data?.reviews ?? [];
  const avgRating = data?.averageRating ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">User Reviews</h1>
          <p className="text-muted-foreground">What traders say about Realona Exchange</p>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-border bg-card text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-3xl font-bold text-primary">{avgRating.toFixed(1)}</div>
              <div className="flex justify-center mt-1">
                <StarRating value={Math.round(avgRating)} readonly />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Average Rating</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-3xl font-bold text-primary">{data?.totalCount ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-2">Total Reviews</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card text-center">
            <CardContent className="pt-4 pb-4">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-sm font-semibold">
                {avgRating >= 4.5 ? "Excellent" : avgRating >= 4 ? "Very Good" : avgRating >= 3 ? "Good" : "Fair"}
              </div>
              <div className="text-xs text-muted-foreground">Platform Trust</div>
            </CardContent>
          </Card>
        </div>

        {/* Submit review */}
        {user && (
          <Card className="border-border bg-card mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Share Your Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Your Review</label>
                <Textarea
                  placeholder="Tell others about your experience on Realona — the escrow process, support quality, ease of trading..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className="bg-background min-h-[100px] text-sm"
                  maxLength={1000}
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{reviewText.length}/1000</div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || rating === 0 || reviewText.trim().length < 10}>
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review list */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : isError ? (
          <QueryErrorState title="We couldn't load platform reviews" onRetry={() => { void refetch(); }} />
        ) : reviews.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No reviews yet. Be the first to share your experience!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r: any) => (
              <Card key={r.id} className="border-border bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {(r.username ?? "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          {r.username ?? "Anonymous"}
                          {r.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <StarRating value={r.rating} readonly />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.review}</p>
                  {r.adminResponse && (
                    <div className="mt-3 bg-muted/50 rounded-lg p-3 border-l-2 border-primary">
                      <p className="text-xs font-semibold text-primary mb-1">Realona Response</p>
                      <p className="text-xs text-muted-foreground">{r.adminResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
