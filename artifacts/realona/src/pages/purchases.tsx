import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useGetPurchaseHistory } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { ShoppingBag, Star, Search, Gamepad2, Users } from "lucide-react";
import { useState } from "react";

function ratingStars(n: number | null | undefined) {
  if (!n) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= n ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const { data: purchases, isLoading } = useGetPurchaseHistory({ query: { queryKey: ["getPurchaseHistory"] } });

  const filtered = (purchases ?? []).filter(p =>
    p.gameName.toLowerCase().includes(search.toLowerCase()) ||
    (p.sellerUsername ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Purchase History</h1>
            <p className="text-sm text-muted-foreground">{purchases?.length ?? 0} completed {purchases?.length === 1 ? "purchase" : "purchases"}</p>
          </div>
        </div>

        {/* Search */}
        {(purchases?.length ?? 0) > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by account name or seller..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-muted"
            />
          </div>
        )}

        {!purchases || purchases.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground text-sm">Your completed account purchases will appear here.</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No purchases match "{search}"</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(purchase => {
              const isSocial = purchase.category === "social_media";
              return (
                <Card key={purchase.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex gap-4 items-start">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        {purchase.pictureUrl ? (
                          <img src={purchase.pictureUrl} alt={purchase.gameName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isSocial ? <Users className="w-7 h-7 text-muted-foreground/40" /> : <Gamepad2 className="w-7 h-7 text-muted-foreground/40" />}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold">{purchase.gameName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Seller: <span className="font-medium text-foreground">{purchase.sellerUsername ?? "—"}</span>
                              {" · "}Trade #{purchase.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{formatNaira(purchase.amount)}</p>
                            {purchase.fee != null && (
                              <p className="text-xs text-muted-foreground">Fee: {formatNaira(purchase.fee)}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">Completed</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(purchase.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {ratingStars(purchase.myRating)}
                          {purchase.ratingComment && (
                            <span className="text-xs text-muted-foreground italic">"{purchase.ratingComment}"</span>
                          )}
                          <Link href={`/trades/${purchase.id}`} className="ml-auto text-xs text-primary underline underline-offset-4">
                            View Trade
                          </Link>
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
