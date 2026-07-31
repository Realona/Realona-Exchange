import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetTrades, useGetMyListings, useGetWalletBalance,
  useGetAnnouncements, useGetActiveGiveaways, useClaimGiveaway
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import {
  Wallet, ShoppingBag, ArrowRightLeft, Plus, TrendingUp,
  Megaphone, Gift, X, HandshakeIcon, Trophy, ShieldCheck, AlertTriangle, Zap, Info, Heart, History, ChevronRight
} from "lucide-react";

function tradeStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    payment_confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    seller_transferred: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    completed: "bg-green-500/10 text-green-600 border-green-500/20",
    disputed: "bg-red-500/10 text-red-600 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  const label: Record<string, string> = {
    pending: "Pending", payment_confirmed: "Payment Confirmed",
    seller_transferred: "Account Sent", completed: "Completed",
    disputed: "Disputed", refunded: "Refunded", cancelled: "Cancelled",
  };
  return <Badge variant="outline" className={`text-xs font-medium ${map[status] ?? ""}`}>{label[status] ?? status}</Badge>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: trades } = useGetTrades();
  const { data: myListings } = useGetMyListings();
  const { data: walletData } = useGetWalletBalance();
  const { data: announcements } = useGetAnnouncements();
  const { data: giveaways, refetch: refetchGiveaways } = useGetActiveGiveaways();
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const claimGiveaway = useClaimGiveaway();

  const recentTrades = trades?.slice(0, 5) ?? [];
  const activeListings = myListings?.filter((l: any) => l.status === "active") ?? [];
  const completedTrades = trades?.filter((t: any) => t.status === "completed").length ?? 0;
  const activeTrades = trades?.filter((t: any) => !["completed", "refunded", "cancelled"].includes(t.status)).length ?? 0;
  const totalListings = myListings?.length ?? 0;

  const activeAnnouncement = announcements?.find((a: any) => a.id !== dismissedAnnouncement);
  const featuredGiveaway = giveaways?.find((g: any) => !g.hasUserClaimed);

  function isTaskComplete(taskType: string) {
    if (taskType === "registration") return true;
    if (taskType === "first_listing") return totalListings > 0;
    if (taskType === "first_trade") return completedTrades > 0;
    return false;
  }

  async function handleClaim(giveawayId: number) {
    claimGiveaway.mutate({ id: giveawayId }, {
      onSuccess: (data: any) => {
        toast({
          title: "🎉 Reward Claimed!",
          description: `₦${Number(data.amountCredited).toLocaleString()} has been added to your wallet.`,
        });
        refetchGiveaways();
        queryClient.invalidateQueries({ queryKey: ["getWalletBalance"] });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Could not claim reward.";
        toast({ title: "Claim failed", description: msg, variant: "destructive" });
      },
    });
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        {/* Announcement Banner */}
        {activeAnnouncement && (
          <div className={`relative rounded-2xl border-2 p-6 mb-10 shadow-lg ${
            activeAnnouncement.priority === "urgent"
              ? "bg-red-500 border-red-400 text-white"
              : activeAnnouncement.priority === "important"
              ? "bg-amber-400 border-amber-300 text-amber-950"
              : "bg-primary border-primary/80 text-primary-foreground"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-3 shrink-0 ${
                activeAnnouncement.priority === "urgent" ? "bg-white/20"
                : activeAnnouncement.priority === "important" ? "bg-amber-950/15"
                : "bg-white/15"
              }`}>
                {activeAnnouncement.priority === "urgent"
                  ? <AlertTriangle className="w-6 h-6" />
                  : activeAnnouncement.priority === "important"
                  ? <Zap className="w-6 h-6" />
                  : <Megaphone className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight">{activeAnnouncement.title}</p>
                {activeAnnouncement.description && (
                  <p className="mt-1 text-base opacity-90 leading-snug">{activeAnnouncement.description}</p>
                )}
              </div>
              <button
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-1 rounded"
                onClick={() => setDismissedAnnouncement(activeAnnouncement.id)}
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.username}! 👋</h1>
          <p className="text-lg text-muted-foreground">Manage your trades, listings and wallet from here.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="border-border bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base text-muted-foreground font-medium">Wallet Balance</span>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-4">{walletData ? formatNaira(walletData.balance) : "..."}</p>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/wallet">Manage Wallet</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base text-muted-foreground font-medium">Active Listings</span>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold mb-4">{activeListings.length}</p>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/listings/my">View Listings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base text-muted-foreground font-medium">Active Trades</span>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-3xl font-bold mb-4 text-blue-500">{activeTrades}</p>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/trades">View Trades</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base text-muted-foreground font-medium">Completed Trades</span>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-500 mb-4">{completedTrades}</p>
              <p className="text-sm text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button size="lg" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/listings/new">
                  <Plus className="w-5 h-5" />
                  New Listing
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/">
                  <ShoppingBag className="w-5 h-5" />
                  Marketplace
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/wallet">
                  <Wallet className="w-5 h-5" />
                  Deposit / Withdraw
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/offers">
                  <HandshakeIcon className="w-5 h-5" />
                  My Offers
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/leaderboard">
                  <Trophy className="w-5 h-5" />
                  Leaderboard
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/wishlist">
                  <Heart className="w-5 h-5" />
                  My Wishlist
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                <Link href="/purchases">
                  <History className="w-5 h-5" />
                  Purchase History
                </Link>
              </Button>
              {user?.kycLevel === 0 && (
                <Button size="lg" variant="outline" className="h-14 text-base justify-start gap-3" asChild>
                  <Link href="/kyc">
                    <ShieldCheck className="w-5 h-5" />
                    Get Verified
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Giveaway widget */}
          {featuredGiveaway && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Active Giveaway</h2>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Gift className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-base">{featuredGiveaway.title}</p>
                      {featuredGiveaway.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{featuredGiveaway.description}</p>
                      )}
                      <p className="text-2xl font-bold text-primary mt-3">{formatNaira(featuredGiveaway.rewardAmount)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-background rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (featuredGiveaway.claimedCount / featuredGiveaway.maxUsers) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{featuredGiveaway.claimedCount}/{featuredGiveaway.maxUsers}</span>
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs capitalize">{featuredGiveaway.taskType.replace(/_/g, " ")}</Badge>
                      <div className="mt-4">
                        {isTaskComplete(featuredGiveaway.taskType) ? (
                          <Button
                            size="sm"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                            onClick={() => handleClaim(featuredGiveaway.id)}
                            disabled={claimGiveaway.isPending}
                          >
                            <Gift className="w-4 h-4 mr-1.5" />
                            {claimGiveaway.isPending ? "Claiming..." : `Claim ₦${Number(featuredGiveaway.rewardAmount).toLocaleString()} Reward`}
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {featuredGiveaway.taskType === "first_listing" && "Create your first listing to unlock this reward."}
                            {featuredGiveaway.taskType === "first_trade" && "Complete your first trade to unlock this reward."}
                            {featuredGiveaway.taskType === "registration" && "You can claim this reward now!"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold">Recent Trades</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
              <Link href="/trades">View all <ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">No trades yet</p>
                <Button variant="link" asChild className="mt-1 text-base">
                  <Link href="/">Browse listings to start trading</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTrades.map((trade: any) => (
                  <Link key={trade.id} href={`/trades/${trade.id}`} className="py-4 flex items-center justify-between gap-4 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer block">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base truncate">{trade.gameName ?? `Trade #${trade.id}`}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {trade.buyerId === user?.id ? `Buying from ${trade.sellerUsername}` : `Selling to ${trade.buyerUsername}`}
                        {" · "}
                        {new Date(trade.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {tradeStatusBadge(trade.status)}
                      <span className="font-bold text-lg">{formatNaira(trade.amount)}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
