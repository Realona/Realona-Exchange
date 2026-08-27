import { useState } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Search, Eye, EyeOff, Copy, Star } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useGetPurchases } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QueryErrorState } from "@/components/query-error-state";

function StarRating({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-muted-foreground">Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

function CredentialField({ label, value }: { label: string; value: string | null | undefined }) {
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  if (!value) return null;

  const copy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied!` });
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="font-mono text-xs flex-1 truncate">
        {visible ? value : "•".repeat(Math.min(value.length, 12))}
      </span>
      <div className="flex gap-1">
        <button onClick={() => setVisible((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={copy} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Purchases() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: purchases, isLoading, isError, refetch } = useGetPurchases({
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Purchase History</h1>
          </div>
          <p className="text-muted-foreground">All accounts you've successfully bought on Realona Exchange.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by account name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              className="w-36"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState title="We couldn't load your purchases" onRetry={() => { void refetch(); }} />
        ) : !purchases || purchases.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
            <p className="text-muted-foreground mb-6">
              {search || from || to ? "No purchases match your filters." : "Your completed purchases will appear here."}
            </p>
            <Button asChild>
              <Link href="/">Browse Marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase: any) => (
              <Card key={purchase.tradeId} className="border-border bg-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {purchase.pictureUrl && (
                      <div className="sm:w-32 sm:h-32 bg-muted shrink-0 overflow-hidden">
                        <img
                          src={purchase.pictureUrl}
                          alt={purchase.gameName ?? "Account"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{purchase.gameName ?? `Trade #${purchase.tradeId}`}</h3>
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>
                            {purchase.category === "social_media" && (
                              <Badge variant="outline" className="text-xs capitalize bg-purple-500/10 text-purple-500 border-purple-500/20">Social</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Bought from <strong>{purchase.sellerUsername ?? "Unknown"}</strong> ·{" "}
                            {new Date(purchase.purchasedAt ?? purchase.createdAt).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatNaira(purchase.amount)}</p>
                          <p className="text-xs text-muted-foreground">Trade #{purchase.tradeId}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Account Credentials</p>
                          {!purchase.konamiId && !purchase.konamiPassword && !purchase.accessCode ? (
                            <p className="text-xs text-muted-foreground italic">No credentials stored.</p>
                          ) : (
                            <>
                              <CredentialField label="Konami ID" value={purchase.konamiId} />
                              <CredentialField label="Password" value={purchase.konamiPassword} />
                              <CredentialField label="OTP / Access Code" value={purchase.accessCode} />
                            </>
                          )}
                        </div>

                        <div className="sm:w-40">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Your Rating</p>
                          <StarRating value={purchase.ratingGiven} />
                          {!purchase.ratingGiven && (
                            <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1" asChild>
                              <Link href={`/trades/${purchase.tradeId}`}>Rate this trade</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
