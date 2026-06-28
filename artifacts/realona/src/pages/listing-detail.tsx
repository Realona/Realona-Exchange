import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetListing, useCreateTrade } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listing, isLoading, isError } = useGetListing(Number(id));
  const createTrade = useCreateTrade();

  const handleBuy = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    createTrade.mutate(
      { data: { listingId: Number(id) } },
      {
        onSuccess: (trade) => {
          toast({ title: "Trade initiated!", description: "Go to your trade to confirm payment." });
          queryClient.invalidateQueries({ queryKey: ["getTrades"] });
          setLocation(`/trades/${trade.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to start trade", description: err?.data?.error ?? err?.message ?? "Something went wrong.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !listing) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-muted-foreground mb-6">This listing may have been sold or removed.</p>
          <Button asChild><a href="/">Browse Marketplace</a></Button>
        </div>
      </Layout>
    );
  }

  const isMine = user?.id === listing.sellerId;
  const isAvailable = listing.status === "active";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
              {listing.pictureUrl ? (
                <img src={listing.pictureUrl} alt={listing.gameName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">No Image</div>
              )}
            </div>
            {/* Trust indicators */}
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Why buy here?</h3>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Escrow Protection</p>
                    <p className="text-xs text-muted-foreground">Your funds are held until you confirm full access.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Dispute Resolution</p>
                    <p className="text-xs text-muted-foreground">Admins intervene if anything goes wrong.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs">{listing.gameName}</Badge>
                {listing.status !== "active" && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{listing.status}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-3">{listing.description}</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <User className="w-4 h-4" />
                <span>Sold by <strong>{listing.sellerUsername}</strong></span>
              </div>
            </div>

            {/* Price */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Listing Price</p>
                <p className="text-4xl font-bold text-primary">{formatNaira(listing.price)}</p>
                <p className="text-xs text-muted-foreground mt-2">Platform fee (2.5%) deducted from seller earnings</p>
              </CardContent>
            </Card>

            {/* Action */}
            {isMine ? (
              <div className="bg-muted border border-border rounded-lg p-4 text-sm text-center text-muted-foreground">
                This is your listing.
              </div>
            ) : !isAvailable ? (
              <div className="bg-muted border border-border rounded-lg p-4 text-sm text-center text-muted-foreground">
                This listing is no longer available.
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold"
                onClick={handleBuy}
                disabled={createTrade.isPending}
              >
                {createTrade.isPending ? "Initiating Trade..." : "Buy Now — Start Escrow"}
              </Button>
            )}

            {!user && (
              <p className="text-center text-sm text-muted-foreground">
                <a href="/login" className="text-primary underline underline-offset-4">Login</a> to purchase this account.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
