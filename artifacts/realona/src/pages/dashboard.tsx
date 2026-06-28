import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetTrades, useGetMyListings, useGetWalletBalance } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Wallet, ShoppingBag, ArrowRightLeft, Plus, TrendingUp } from "lucide-react";

function tradeStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    payment_confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    seller_transferred: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    disputed: "bg-red-500/10 text-red-500 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  const label: Record<string, string> = {
    pending: "Pending",
    payment_confirmed: "Payment Confirmed",
    seller_transferred: "Account Sent",
    completed: "Completed",
    disputed: "Disputed",
    refunded: "Refunded",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {label[status] ?? status}
    </Badge>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: trades } = useGetTrades();
  const { data: myListings } = useGetMyListings();
  const { data: walletData } = useGetWalletBalance();

  const recentTrades = trades?.slice(0, 5) ?? [];
  const activeListings = myListings?.filter((l: any) => l.status === "active") ?? [];
  const completedTrades = trades?.filter((t: any) => t.status === "completed").length ?? 0;
  const activeTrades = trades?.filter((t: any) => !["completed", "refunded"].includes(t.status)).length ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Welcome back, {user?.username}!</h1>
          <p className="text-muted-foreground">Manage your trades, listings and wallet from here.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Wallet Balance</span>
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{walletData ? formatNaira(walletData.balance) : "..."}</p>
              <Button size="sm" variant="outline" className="mt-3 w-full text-xs" asChild>
                <Link href="/wallet">Manage Wallet</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Active Listings</span>
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{activeListings.length}</p>
              <Button size="sm" variant="outline" className="mt-3 w-full text-xs" asChild>
                <Link href="/listings/my">View Listings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Active Trades</span>
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{activeTrades}</p>
              <Button size="sm" variant="outline" className="mt-3 w-full text-xs" asChild>
                <Link href="/trades">View Trades</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">Completed Trades</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-500">{completedTrades}</p>
              <p className="text-xs text-muted-foreground mt-3">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button asChild>
            <Link href="/listings/new">
              <Plus className="w-4 h-4 mr-2" />
              New Listing
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Browse Marketplace</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/wallet">Deposit / Withdraw</Link>
          </Button>
        </div>

        {/* Recent Trades */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Trades</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/trades">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>No trades yet.</p>
                <Button variant="link" asChild className="mt-1">
                  <Link href="/">Browse listings to start trading</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTrades.map(trade => (
                  <div key={trade.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{trade.gameName ?? `Trade #${trade.id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {trade.buyerId === user?.id ? `Buying from ${trade.sellerUsername}` : `Selling to ${trade.buyerUsername}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {tradeStatusBadge(trade.status)}
                      <span className="font-semibold text-sm">{formatNaira(trade.amount)}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/trades/${trade.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
