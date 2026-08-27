import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShieldCheck, Trash2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useGetWishlist, useRemoveFromWishlist } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QueryErrorState } from "@/components/query-error-state";

export default function Wishlist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading, isError, refetch } = useGetWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const handleRemove = (listingId: number) => {
    removeFromWishlist.mutate(
      { listingId },
      {
        onSuccess: () => {
          toast({ title: "Removed from wishlist" });
          queryClient.invalidateQueries({ queryKey: ["getWishlist"] });
          queryClient.invalidateQueries({ queryKey: ["getWishlistIds"] });
        },
        onError: () => {
          toast({ title: "Failed to remove", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <h1 className="text-3xl font-bold">My Wishlist</h1>
          </div>
          <p className="text-muted-foreground">Listings you've saved. You'll be notified if any are sold.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState title="We couldn't load your wishlist" onRetry={() => { void refetch(); }} />
        ) : !items || items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Save listings by clicking the heart icon on any listing.</p>
            <Button asChild>
              <Link href="/">Browse Marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item: any) => {
              const listing = item.listing;
              const isSocial = listing?.category === "social_media";
              return (
                <Card
                  key={item.wishlistId}
                  className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors group flex flex-col"
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {listing?.pictureUrl ? (
                      <img
                        src={listing.pictureUrl}
                        alt={listing.gameName}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary text-sm">
                        No Screenshot
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-primary font-bold px-3 py-1 rounded shadow-sm border border-border text-sm">
                      {listing ? formatNaira(listing.price) : "—"}
                    </div>
                    {listing?.status !== "active" && listing?.status && (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-sm">
                          {listing.status === "sold" ? "Sold" : "Unavailable"}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {isSocial ? (
                        <>
                          {listing?.platform && (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs capitalize">{listing.platform}</Badge>
                          )}
                          {listing?.followerCount != null && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                              {Number(listing.followerCount).toLocaleString()} followers
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {listing?.divisionRank && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{listing.divisionRank}</Badge>
                          )}
                          {listing?.squadRating != null && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                              {listing.squadRating} OVR
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 mb-2">{listing?.description}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {listing?.sellerUsername?.[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">{listing?.sellerUsername}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Saved {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex gap-2">
                    {listing?.status === "active" ? (
                      <Button className="flex-1" asChild>
                        <Link href={`/listings/${listing.id}`}>View Details</Link>
                      </Button>
                    ) : (
                      <Button className="flex-1" variant="outline" disabled>
                        {listing?.status === "sold" ? "Already Sold" : "Unavailable"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:bg-red-500/10 border-red-500/20"
                      onClick={() => listing && handleRemove(listing.id)}
                      disabled={removeFromWishlist.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
