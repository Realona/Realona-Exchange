import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPublicWishlist } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Heart, HeartOff, ShoppingCart, Users, Gamepad2, AlertTriangle } from "lucide-react";

export default function PublicWishlistPage() {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, isError } = useGetPublicWishlist(username, {
    query: { queryKey: ["getPublicWishlist", username] },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Wishlist Not Found</h2>
          <p className="text-muted-foreground mb-6">This user hasn't made their wishlist public, or the username doesn't exist.</p>
          <Link href="/"><Button>Browse Marketplace</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
            {data.username[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {data.username}'s Wishlist
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.items.length} {data.items.length === 1 ? "account" : "accounts"} saved
            </p>
          </div>
        </div>

        {data.items.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <HeartOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No public listings saved</h3>
              <p className="text-muted-foreground text-sm">This wishlist is empty or all saved listings are no longer available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.items.map(item => {
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
                            <h3 className="font-semibold truncate">{l?.gameName ?? "Account"}</h3>
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

                          {isSocialMedia && l?.platform && (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs capitalize">{l.platform}</Badge>
                          )}
                          {!isSocialMedia && l?.divisionRank && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{l.divisionRank}</Badge>
                          )}

                          {l?.sellerUsername && (
                            <span className="text-xs text-muted-foreground">by {l.sellerUsername}</span>
                          )}

                          {l?.status === "active" && (
                            <Link href={`/listings/${item.listingId}`} className="ml-auto">
                              <Button size="sm" className="h-7 text-xs">
                                <ShoppingCart className="w-3 h-3 mr-1.5" />
                                Buy Now
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Shared via <Link href="/" className="text-primary underline underline-offset-4">Realona Exchange</Link>
        </p>
      </div>
    </Layout>
  );
}
