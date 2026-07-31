import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetTrades } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Link } from "wouter";
import { ArrowRightLeft, ChevronRight } from "lucide-react";

function statusBadge(status: string) {
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
    pending: "Awaiting Payment",
    payment_confirmed: "Payment Confirmed",
    seller_transferred: "Account Sent",
    completed: "Completed",
    disputed: "Disputed",
    refunded: "Refunded",
    cancelled: "Cancelled",
  };
  return <Badge variant="outline" className={`text-sm px-3 py-1 font-medium ${map[status] ?? ""}`}>{label[status] ?? status}</Badge>;
}

export default function Trades() {
  const { user } = useAuth();
  const { data: trades, isLoading } = useGetTrades();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">My Trades</h1>
          <p className="text-lg text-muted-foreground">Track all your buying and selling activity.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : !trades || trades.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card/50">
            <ArrowRightLeft className="w-16 h-16 mx-auto mb-5 text-muted-foreground/30" />
            <h3 className="text-2xl font-bold mb-3">No trades yet</h3>
            <p className="text-muted-foreground text-lg mb-8">Start by buying a game account from the marketplace.</p>
            <Button size="lg" asChild><Link href="/">Browse Marketplace</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map(trade => {
              const isBuyer = trade.buyerId === user?.id;
              return (
                <Card key={trade.id} className="border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="p-6 flex items-center gap-5">
                    {trade.pictureUrl ? (
                      <img src={trade.pictureUrl} alt={trade.gameName ?? ""} className="w-20 h-20 object-cover rounded-xl shrink-0 border border-border" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-bold text-lg truncate">{trade.gameName ?? `Trade #${trade.id}`}</p>
                      <p className="text-muted-foreground">
                        {isBuyer ? `Buying from ${trade.sellerUsername}` : `Selling to ${trade.buyerUsername}`}
                      </p>
                      <p className="text-sm text-muted-foreground/70">{new Date(trade.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {statusBadge(trade.status)}
                      <span className="font-bold text-xl text-primary">{formatNaira(trade.amount)}</span>
                      <Button size="sm" className="gap-1" asChild>
                        <Link href={`/trades/${trade.id}`}>
                          View Trade <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
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
