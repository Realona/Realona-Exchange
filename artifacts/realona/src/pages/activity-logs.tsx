import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetTrades } from "@workspace/api-client-react";
import { LogIn, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

type LogEntry = {
  id: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  time: string | Date | null | undefined;
  badge?: { label: string; variant: "default" | "secondary" | "destructive" | "outline" };
};

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) { navigate("/login"); return null; }

  const { data: trades, isLoading } = useGetTrades({ query: { queryKey: ["getTradesActivity"] } });

  // Build a synthetic log from trades
  const logs: LogEntry[] = [];

  (trades ?? []).forEach((trade: any) => {
    const isBuyer = trade.buyerId === user.id;
    const label = isBuyer ? "Bought account" : "Sold account";
    const icon = isBuyer
      ? <ShoppingCart className="w-4 h-4 text-blue-500" />
      : <Package className="w-4 h-4 text-green-500" />;

    logs.push({
      id: `trade-${trade.id}`,
      icon,
      label: `${label}: ${trade.gameName ?? "Account"}`,
      detail: `Trade #${trade.id} · ₦${Number(trade.amount).toLocaleString()}`,
      time: trade.createdAt,
      badge: trade.status === "completed"
        ? { label: "Completed", variant: "default" }
        : trade.status === "disputed"
        ? { label: "Disputed", variant: "destructive" }
        : { label: trade.status.replace(/_/g, " "), variant: "secondary" },
    });
  });

  // Sort newest first
  logs.sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Your recent trading activity on Realona Exchange.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <LogIn className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No activity yet. Start by buying or selling an account!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div className="mt-0.5 p-2 rounded-full bg-muted shrink-0">{log.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.label}</p>
                  <p className="text-xs text-muted-foreground">{log.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  {log.badge && (
                    <Badge variant={log.badge.variant} className="mb-1 text-xs capitalize">
                      {log.badge.label}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(log.time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-8">
          Showing your last {logs.length} activity entries from all trades.
        </p>
      </div>
    </Layout>
  );
}
