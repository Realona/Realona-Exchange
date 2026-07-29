import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetMyOffers, useRespondToOffer, useCreateTrade } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { HandshakeIcon, Clock, CheckCircle, XCircle, ArrowRightLeft, RefreshCcw } from "lucide-react";

function offerStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    accepted: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    countered: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    expired: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  const labels: Record<string, string> = {
    pending: "Pending", accepted: "Accepted", rejected: "Rejected",
    countered: "Countered", expired: "Expired",
  };
  return <Badge variant="outline" className={styles[status] ?? ""}>{labels[status] ?? status}</Badge>;
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function Offers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [counterDialogOffer, setCounterDialogOffer] = useState<any>(null);
  const [counterAmount, setCounterAmount] = useState("");

  const { data: offers, isLoading } = useGetMyOffers();
  const respond = useRespondToOffer();
  const startTrade = useCreateTrade();

  const myOffersMade = offers?.filter((o: any) => o.buyerId === user?.id) ?? [];
  const offersReceived = offers?.filter((o: any) => o.sellerId === user?.id) ?? [];
  // Offers where the buyer now needs to respond (seller countered back)
  const buyerActionNeeded = myOffersMade.filter((o: any) => o.status === "countered").length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["getMyOffers"] });
  };

  const handleRespond = (offerId: number, action: "accept" | "reject" | "counter", ca?: number) => {
    respond.mutate(
      { id: offerId, data: { action, counterAmount: ca } },
      {
        onSuccess: () => {
          toast({ title: action === "accept" ? "Offer accepted!" : action === "reject" ? "Offer rejected." : "Counter sent!" });
          invalidate();
          setCounterDialogOffer(null);
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleStartTrade = (listingId: number) => {
    startTrade.mutate(
      { data: { listingId } },
      {
        onSuccess: (trade: any) => {
          toast({ title: "Trade started!" });
          setLocation(`/trades/${trade.id}`);
        },
        onError: (err: any) => toast({ title: "Failed to start trade", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const OfferCard = ({ offer, isReceiver }: { offer: any; isReceiver: boolean }) => (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate mb-1">
              {offer.listingTitle ?? `Listing #${offer.listingId}`}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {isReceiver ? `From: ${offer.buyerUsername ?? "Buyer"}` : `To: ${offer.sellerUsername ?? "Seller"}`}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-primary">{formatNaira(offer.amount)}</span>
              {offer.counterAmount && (
                <span className="text-xs text-muted-foreground">→ Counter: {formatNaira(offer.counterAmount)}</span>
              )}
              {offerStatusBadge(offer.status)}
            </div>
            {offer.message && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{offer.message}"</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              {timeLeft(offer.expiresAt)}
            </div>
            {/* Receiver can act on pending or countered-back offers */}
            {isReceiver && (offer.status === "pending" || offer.status === "countered") && (
              <div className="flex flex-col gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={() => handleRespond(offer.id, "accept")}>Accept</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCounterDialogOffer(offer); setCounterAmount(String(offer.counterAmount ?? offer.amount)); }}>Counter</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRespond(offer.id, "reject")}>Reject</Button>
              </div>
            )}
            {/* Buyer can act on a counter that the seller sent back */}
            {!isReceiver && offer.status === "countered" && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-blue-500 font-semibold mb-1 text-right">Seller countered</p>
                <Button size="sm" className="h-7 text-xs" onClick={() => handleRespond(offer.id, "accept")}>Accept</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCounterDialogOffer(offer); setCounterAmount(String(offer.counterAmount ?? offer.amount)); }}>Counter</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRespond(offer.id, "reject")}>Reject</Button>
              </div>
            )}
            {!isReceiver && offer.status === "accepted" && (
              <Button size="sm" className="h-7 text-xs" onClick={() => handleStartTrade(offer.listingId)}>
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                Start Trade
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandshakeIcon className="w-6 h-6 text-primary" />
            My Offers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your offer negotiations.</p>
        </div>

        <Tabs defaultValue="received">
          <TabsList className="mb-6">
            <TabsTrigger value="received">
              Received
              {offersReceived.filter((o: any) => o.status === "pending" || o.status === "countered").length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {offersReceived.filter((o: any) => o.status === "pending" || o.status === "countered").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="made">
            Made
            {buyerActionNeeded > 0 && (
              <span className="ml-2 bg-blue-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {buyerActionNeeded}
              </span>
            )}
          </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : offersReceived.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <HandshakeIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No offers received yet.</p>
                <p className="text-xs mt-1">Buyers can make offers on your active listings.</p>
              </div>
            ) : (
              <div className="space-y-3">{offersReceived.map((o: any) => <OfferCard key={o.id} offer={o} isReceiver />)}</div>
            )}
          </TabsContent>

          <TabsContent value="made">
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : myOffersMade.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <RefreshCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No offers made yet.</p>
                <p className="text-xs mt-1">Browse listings and make offers on ones you want.</p>
              </div>
            ) : (
              <div className="space-y-3">{myOffersMade.map((o: any) => <OfferCard key={o.id} offer={o} isReceiver={false} />)}</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Counter dialog */}
        <Dialog open={!!counterDialogOffer} onOpenChange={(v) => { if (!v) setCounterDialogOffer(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Counter Offer</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {counterDialogOffer?.status === "countered" && counterDialogOffer?.counterAmount
                  ? <>Their counter: <span className="font-semibold text-foreground">{formatNaira(counterDialogOffer.counterAmount)}</span></>
                  : <>Original offer: <span className="font-semibold text-foreground">{counterDialogOffer ? formatNaira(counterDialogOffer.amount) : ""}</span></>
                }
              </p>
              <label className="text-sm font-medium">Your counter amount (₦)</label>
              <Input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCounterDialogOffer(null)}>Cancel</Button>
              <Button onClick={() => handleRespond(counterDialogOffer.id, "counter", Number(counterAmount))} disabled={!counterAmount || respond.isPending}>
                Send Counter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
