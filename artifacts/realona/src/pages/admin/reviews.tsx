import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGetPlatformReviews, useAdminRespondToReview } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdminNav } from "./users";
import { Star, MessageSquare, ShieldCheck, Clock } from "lucide-react";
import { QueryErrorState } from "@/components/query-error-state";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-muted-foreground">{rating}/5</span>
    </div>
  );
}

export default function AdminReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [respondId, setRespondId] = useState<number | null>(null);
  const [response, setResponse] = useState("");

  const { data, isLoading, isError, refetch } = useGetPlatformReviews({ query: { queryKey: ["getPlatformReviews"] } });
  const adminRespond = useAdminRespondToReview();

  const reviews = data?.reviews ?? [];
  const averageRating = data?.averageRating ?? 0;
  const totalCount = data?.totalCount ?? 0;

  // Show unanswered first
  const sorted = [...reviews].sort((a, b) => {
    if (!a.adminResponse && b.adminResponse) return -1;
    if (a.adminResponse && !b.adminResponse) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleRespond = () => {
    if (!respondId || !response.trim()) return;
    adminRespond.mutate(
      { id: respondId, data: { response: response.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Response posted" });
          queryClient.invalidateQueries({ queryKey: ["getPlatformReviews"] });
          setRespondId(null);
          setResponse("");
        },
        onError: (err: any) =>
          toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const pending = reviews.filter(r => !r.adminResponse);
  const selectedReview = reviews.find(r => r.id === respondId);

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Platform Reviews</h1>
            <p className="text-muted-foreground text-sm">Manage user reviews and post official responses.</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{averageRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{totalCount} reviews</p>
            </div>
            {pending.length > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 self-start">
                <Clock className="w-3 h-3 mr-1" />
                {pending.length} awaiting response
              </Badge>
            )}
          </div>
        </div>

        {/* Reviews list */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
            ))
          ) : isError ? (
            <QueryErrorState title="We couldn't load platform reviews" onRetry={() => { void refetch(); }} />
          ) : sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No reviews yet.</p>
          ) : (
            sorted.map(review => (
              <Card
                key={review.id}
                className={`border-border bg-card ${!review.adminResponse ? "border-yellow-500/30" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {/* Reviewer info */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StarDisplay rating={review.rating} />
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-medium">
                          {review.username ?? `User #${review.userId}`}
                        </span>
                        {review.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Review text */}
                      <p className="text-sm text-foreground mb-3">{review.review}</p>

                      {/* Admin response */}
                      {review.adminResponse ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Official Response
                          </p>
                          <p className="text-sm text-foreground">{review.adminResponse}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                          <Clock className="w-3 h-3 mr-1" /> No response yet
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setRespondId(review.id); setResponse(review.adminResponse ?? ""); }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      {review.adminResponse ? "Edit" : "Respond"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Respond dialog */}
      <Dialog open={respondId !== null} onOpenChange={open => { if (!open) { setRespondId(null); setResponse(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Official Response</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-3">
                <StarDisplay rating={selectedReview.rating} />
                <p className="text-sm mt-2 text-foreground">{selectedReview.review}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  — {selectedReview.username ?? `User #${selectedReview.userId}`}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your response</label>
                <Textarea
                  rows={5}
                  placeholder="Write a helpful, professional response..."
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1 flex justify-between gap-2">
                  <span>This will appear publicly under the review.</span>
                  <span>{response.length}/1000</span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRespondId(null); setResponse(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={!response.trim() || adminRespond.isPending}
            >
              {adminRespond.isPending ? "Posting…" : "Post Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
