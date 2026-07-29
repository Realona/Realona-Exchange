import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetWishlist, useRemoveFromWishlist } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, HeartOff, ShoppingCart, Users, Gamepad2, Share2, Copy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function WishlistPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: items, isLoading } = useGetWishlist({ query: { queryKey: ["getWishlist"] } });
  const remove = useRemoveFromWishlist();

  const handleShare = () => {
    const url = `${window.location.origin}/wishlist/${user?.username}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Wishlist link copied!", description: "Share it with anyone to show what you're looking for." });
  };

  const handleRemove = (listingId: number) => {
    remove.mutate({ listingId }, {
      onSuccess: () => {
        toast({ title: "Removed from wishlist" });
        queryClient.invalidateQueries({ queryKey: ["getWishlist"] });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <div>
              <h1 className="text-2xl font-bold">My Wishlist</h1>
              <p className="text-sm text-muted-foreground">{items?.length ?? 0} saved {items?.length === 1 ? "listing" : "listings"}</p>
            </div>
          </div>
          {(items?.length ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 shrink-0">
              <Share2 className="w-4 h-4" />
              Share Wishlist
            </Button>
          )}
        </div>

        {!items || items.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <HeartOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground text-sm mb-6">Save listings you're interested in — you'll be notified when they change.</p>
              <Link href="/">
                <Button>Browse Listings</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const l = item.listing;
              const isSocialMedia = l?.category === "social_media";
              return (
                <Card key={item.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                        {l?.pictureUrl ? (
                          <img src={l.pictureUrl} alt={l.gameName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isSocialMedia ? <Users className="w-8 h-8 text-muted-foreground/40" /> : <Gamepad2 className="w-8 h-8 text-muted-foreground/40" />}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{l?.gameName ?? "Listing"}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l?.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary">{l?.price !== undefined ? formatNaira(l.price) : "—"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {l?.status === "sold" ? (
                            <Badge variant="outline" className="text-gray-500 border-gray-500/30 text-xs">Sold</Badge>
                          ) : l?.status === "active" ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">Available</Badge>
                          ) : null}

                          {l?.sellerUsername && (
                            <span className="text-xs text-muted-foreground">by {l.sellerUsername}</span>
                          )}

                          <div className="ml-auto flex gap-2">
                            {l?.status === "active" && (
                              <Link href={`/listings/${item.listingId}`}>
                                <Button size="sm" className="h-7 text-xs">
                                  <ShoppingCart className="w-3 h-3 mr-1.5" />
                                  View
                                </Button>
                              </Link>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => handleRemove(item.listingId)}
                              disabled={remove.isPending}
                            >
                              <HeartOff className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
