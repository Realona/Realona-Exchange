import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useGetAdminTrades, useForceCompleteTrade, useRefundBuyer } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdminNav } from "./users";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    payment_confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    seller_transferred: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    disputed: "bg-red-500/10 text-red-500 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return <Badge variant="outline" className={`text-xs ${map[status] ?? ""}`}>{status.replace("_", " ")}</Badge>;
}

export default function AdminTrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: trades } = useGetAdminTrades({ status: statusFilter === "all" ? undefined : statusFilter });
  const forceComplete = useForceCompleteTrade();
  const refundBuyer = useRefundBuyer();

  const handleForceComplete = (id: number) => {
    forceComplete.mutate({ id }, {
      onSuccess: () => { toast({ title: "Trade force-completed" }); queryClient.invalidateQueries({ queryKey: ["getAdminTrades"] }); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleRefund = (id: number) => {
    refundBuyer.mutate({ id }, {
      onSuccess: () => { toast({ title: "Buyer refunded" }); queryClient.invalidateQueries({ queryKey: ["getAdminTrades"] }); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Trades</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="payment_confirmed">Payment Confirmed</SelectItem>
              <SelectItem value="seller_transferred">Account Sent</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {!trades ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)
          ) : trades.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No trades found.</p>
          ) : trades.map(trade => (
            <Card key={trade.id} className={`border-border bg-card ${trade.status === "disputed" ? "border-red-500/30" : ""}`}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">#{trade.id}</span>
                    <span className="text-sm text-muted-foreground">{trade.gameName}</span>
                    {statusBadge(trade.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buyer: <strong>{trade.buyerUsername}</strong> · Seller: <strong>{trade.sellerUsername}</strong>
                    {trade.disputeReason && <span className="text-red-400"> · {trade.disputeReason}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold">{formatNaira(trade.amount)}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/trades/${trade.id}`}>View</Link>
                  </Button>
                  {["payment_confirmed", "seller_transferred", "disputed"].includes(trade.status) && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleForceComplete(trade.id)}
                        disabled={forceComplete.isPending}
                      >
                        Force Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/30"
                        onClick={() => handleRefund(trade.id)}
                        disabled={refundBuyer.isPending}
                      >
                        Refund Buyer
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
