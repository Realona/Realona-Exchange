import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGetListing, useCreateTrade, useMakeOffer, useAddToWishlist, useRemoveFromWishlist, useGetWishlist } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, ArrowRightLeft, AlertTriangle, HandshakeIcon, Users, Star, Gamepad2, Share2, Copy, Link, Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const SOCIAL_PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG",
  "twitter/x": "X",
  tiktok: "TT",
  youtube: "YT",
  facebook: "FB",
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const { data: listing, isLoading, isError } = useGetListing(Number(id));
  const createTrade = useCreateTrade();
  const makeOffer = useMakeOffer();
  const addWishlist = useAddToWishlist();
  const removeWishlist = useRemoveFromWishlist();
  const { data: wishlistItems } = useGetWishlist({ query: { enabled: !!user, queryKey: ["getWishlist"] } });
  const isWishlisted = (wishlistItems ?? []).some(w => w.listingId === Number(id));

  const toggleWishlist = () => {
    if (!user) { toast({ title: "Login to save listings", variant: "destructive" }); return; }
    if (isWishlisted) {
      removeWishlist.mutate({ listingId: Number(id) }, {
        onSuccess: () => { toast({ title: "Removed from wishlist" }); queryClient.invalidateQueries({ queryKey: ["getWishlist"] }); }
      });
    } else {
      addWishlist.mutate({ listingId: Number(id) }, {
        onSuccess: () => { toast({ title: "Saved to wishlist ❤️" }); queryClient.invalidateQueries({ queryKey: ["getWishlist"] }); }
      });
    }
  };

  const handleBuy = () => {
    if (!user) { setLocation("/login"); return; }
    createTrade.mutate(
      { data: { listingId: Number(id) } },
      {
        onSuccess: (trade: any) => {
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

  const handleMakeOffer = () => {
    if (!user) { setLocation("/login"); return; }
    if (!offerAmount || Number(offerAmount) <= 0) {
      toast({ title: "Enter a valid offer amount", variant: "destructive" }); return;
    }
    makeOffer.mutate(
      { id: Number(id), data: { amount: Number(offerAmount), message: offerMessage || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Offer sent!", description: "The seller will respond within 24 hours." });
          setOfferOpen(false);
          setOfferAmount("");
          setOfferMessage("");
          queryClient.invalidateQueries({ queryKey: ["getMyOffers"] });
        },
        onError: (err: any) => {
          toast({ title: "Failed to send offer", description: err?.data?.error ?? err?.message, variant: "destructive" });
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
  const isSocial = (listing as any).category === "social_media";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image / Social Info */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
              {listing.pictureUrl ? (
                <img src={listing.pictureUrl} alt={listing.gameName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">
                  {isSocial ? <Users className="w-12 h-12 opacity-30" /> : <Gamepad2 className="w-12 h-12 opacity-30" />}
                </div>
              )}
            </div>

            {/* Social media stats */}
            {isSocial && (
              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Account Details</h3>
                  {(listing as any).platform && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform</span>
                      <span className="font-medium capitalize">{(listing as any).platform}</span>
                    </div>
                  )}
                  {(listing as any).accountHandle && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Handle</span>
                      <span className="font-medium">@{(listing as any).accountHandle}</span>
                    </div>
                  )}
                  {(listing as any).followerCount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Followers</span>
                      <span className="font-medium">{Number((listing as any).followerCount).toLocaleString()}</span>
                    </div>
                  )}
                  {(listing as any).following != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Following</span>
                      <span className="font-medium">{Number((listing as any).following).toLocaleString()}</span>
                    </div>
                  )}
                  {(listing as any).accountAge && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Age</span>
                      <span className="font-medium">{(listing as any).accountAge}</span>
                    </div>
                  )}
                  {(listing as any).engagementRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Engagement Rate</span>
                      <span className="font-medium">{(listing as any).engagementRate}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="text-xs">{listing.gameName}</Badge>
                {isSocial && (listing as any).platform && (
                  <Badge variant="outline" className="text-xs capitalize">{(listing as any).platform}</Badge>
                )}
                {listing.status !== "active" && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{listing.status}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-3">{listing.description}</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <User className="w-4 h-4" />
                <span>Sold by <strong>{listing.sellerUsername}</strong></span>
                {(listing as any).sellerIsVerified && (
                  <span title="Verified Seller" className="inline-flex items-center text-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Listing Price</p>
                <p className="text-4xl font-bold text-primary">{formatNaira(listing.price)}</p>
                <p className="text-xs text-muted-foreground mt-2">Platform fee (4%) deducted from seller earnings</p>
              </CardContent>
            </Card>

            {/* Actions */}
            {isMine ? (
              <div className="bg-muted border border-border rounded-lg p-4 text-sm text-center text-muted-foreground">
                This is your listing.
              </div>
            ) : !isAvailable ? (
              <div className="bg-muted border border-border rounded-lg p-4 text-sm text-center text-muted-foreground">
                This listing is no longer available.
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full h-14 text-lg font-semibold"
                  onClick={handleBuy}
                  disabled={createTrade.isPending}
                >
                  {createTrade.isPending ? "Initiating Trade..." : "Buy Now — Start Escrow"}
                </Button>
                {user && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-12 font-semibold"
                    onClick={() => setOfferOpen(true)}
                  >
                    <HandshakeIcon className="w-4 h-4 mr-2" />
                    Make an Offer
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full h-11 font-semibold ${isWishlisted ? "text-red-500 border-red-500/30 hover:bg-red-500/10" : "text-muted-foreground"}`}
                  onClick={toggleWishlist}
                  disabled={addWishlist.isPending || removeWishlist.isPending}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isWishlisted ? "fill-red-500" : ""}`} />
                  {isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                </Button>
              </div>
            )}

            {!user && (
              <p className="text-center text-sm text-muted-foreground">
                <a href="/login" className="text-primary underline underline-offset-4">Login</a> to purchase this account.
              </p>
            )}

            {/* Player Highlights (eFootball) */}
            {(listing as any).highlightedPlayers?.length > 0 && (
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">⭐ Top Players</p>
                  <div className="flex flex-wrap gap-2">
                    {(listing as any).highlightedPlayers.map((player: string) => (
                      <span key={player} className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium">{player}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Sharing */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                  <Share2 className="w-3.5 h-3.5 inline mr-1.5" />Share This Listing
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline" size="sm"
                    className="text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this ${listing.gameName} account on Realona Exchange — ${listing.description.slice(0, 80)}... Price: ₦${Number(listing.price).toLocaleString()} 👉 ${window.location.href}`)}`, "_blank")}
                  >
                    📱 WhatsApp
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="text-xs"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Buy this ${listing.gameName} account on Realona Exchange for ₦${Number(listing.price).toLocaleString()} 🎮`)}&url=${encodeURIComponent(window.location.href)}`, "_blank")}
                  >
                    𝕏 Twitter/X
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="text-xs"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); }}
                  >
                    <Copy className="w-3 h-3 mr-1.5" />Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Make Offer Dialog */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandshakeIcon className="w-5 h-5 text-primary" />
              Make an Offer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Listed price: <span className="font-semibold text-foreground">{formatNaira(listing?.price ?? 0)}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your offer amount (₦)</label>
              <Input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter your offer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message <span className="text-muted-foreground text-xs">(optional)</span></label>
              <Textarea
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Explain your offer..."
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your offer expires in 24 hours. The seller can accept, reject, or counter.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button onClick={handleMakeOffer} disabled={makeOffer.isPending}>
              {makeOffer.isPending ? "Sending..." : "Send Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
