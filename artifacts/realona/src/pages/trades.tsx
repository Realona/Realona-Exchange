import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetTrades } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Link } from "wouter";
import { ArrowRightLeft } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    payment_confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    seller_transferred: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    disputed: "bg-red-500/10 text-red-500 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  const label: Record<string, string> = {
    pending: "Awaiting Payment",
    payment_confirmed: "Payment Confirmed",
    seller_transferred: "Account Sent",
    completed: "Completed",
    disputed: "Disputed",
    refunded: "Refunded",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{label[status] ?? status}</Badge>;
}

export default function Trades() {
  const { user } = useAuth();
  const { data: trades, isLoading } = useGetTrades();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">My Trades</h1>
          <p className="text-muted-foreground">Track all your buying and selling activity.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : !trades || trades.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
            <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-xl font-semibold mb-2">No trades yet</h3>
            <p className="text-muted-foreground mb-6">Start by buying a game account from the marketplace.</p>
            <Button asChild><Link href="/">Browse Marketplace</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map(trade => {
              const isBuyer = trade.buyerId === user?.id;
              return (
                <Card key={trade.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    {trade.pictureUrl && (
                      <img src={trade.pictureUrl} alt={trade.gameName ?? ""} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{trade.gameName ?? `Trade #${trade.id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {isBuyer ? `Buying from ${trade.sellerUsername}` : `Selling to ${trade.buyerUsername}`}
                        {" · "}
                        {new Date(trade.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {statusBadge(trade.status)}
                      <span className="font-bold">{formatNaira(trade.amount)}</span>
                      <Button size="sm" asChild>
                        <Link href={`/trades/${trade.id}`}>View</Link>
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
