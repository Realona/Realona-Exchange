import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, Star, ShieldCheck, TrendingUp, Users } from "lucide-react";

function VerifiedBadge() {
  return (
    <span title="Verified Seller" className="inline-flex items-center">
      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
    </span>
  );
}

function PodiumCard({ entry, size }: { entry: any; size: "lg" | "md" | "sm" }) {
  const sizeClasses = {
    lg: "bg-primary/10 border-primary/30",
    md: "bg-card border-border",
    sm: "bg-card border-border opacity-90",
  };
  const heights = { lg: "h-20", md: "h-14", sm: "h-12" };
  return (
    <div className={`rounded-xl border p-3 text-center ${sizeClasses[size]}`}>
      <div className={`flex items-end justify-center mb-2 ${heights[size]}`}>
        <div>
          <div className={`font-bold ${size === "lg" ? "text-2xl text-primary" : "text-lg"}`}>#{entry.rank}</div>
          <Trophy className={`mx-auto mt-1 ${size === "lg" ? "w-5 h-5 text-yellow-500" : "w-4 h-4 text-muted-foreground"}`} />
        </div>
      </div>
      <p className="font-semibold text-sm truncate flex items-center justify-center gap-1">
        {entry.username}
        {entry.isVerified && <VerifiedBadge />}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{entry.count} trades</p>
      {entry.rating && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium">{Number(entry.rating).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function LeaderboardTable({ entries, showRating = false }: { entries: any[]; showRating?: boolean }) {
  return (
    <div className="space-y-1">
      {entries.map((e: any) => (
        <div key={e.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
          <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{e.rank}</span>
          <p className="flex-1 text-sm font-medium flex items-center gap-1.5">
            {e.username}
            {e.isVerified && <VerifiedBadge />}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {showRating ? (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-foreground">{e.rating ? Number(e.rating).toFixed(1) : "—"}</span>
                <span>({e.count})</span>
              </div>
            ) : (
              <span className="font-semibold text-foreground">{e.count} trades</span>
            )}
            {e.rating && !showRating && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>{Number(e.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, icon: Icon, entries, showRating = false }: {
  title: string; icon: React.ElementType; entries: any[]; showRating?: boolean;
}) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const podiumOrder = top3.length === 3
    ? [{ e: top3[1], s: "md" }, { e: top3[0], s: "lg" }, { e: top3[2], s: "sm" }]
    : top3.map((e: any, i: number) => ({ e, s: i === 0 ? "lg" : "md" }));

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No data yet. Complete trades to appear here.</p>
        ) : (
          <>
            {top3.length > 0 && (
              <div className={`grid gap-2 mb-4 ${top3.length === 3 ? "grid-cols-3" : top3.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"}`}>
                {(top3.length === 3 ? podiumOrder : top3.map((e: any, i: number) => ({ e, s: i === 0 ? "lg" : "md" }))).map(({ e, s }: any) => (
                  <PodiumCard key={e.userId} entry={e} size={s} />
                ))}
              </div>
            )}
            {rest.length > 0 && <LeaderboardTable entries={rest} showRating={showRating} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useGetLeaderboard();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Nigeria's top eFootball account traders, ranked by performance.</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Top Sellers" icon={TrendingUp} entries={data?.topSellers ?? []} />
            <Section title="Top Buyers" icon={Users} entries={data?.topBuyers ?? []} />
            <Section title="Most Trusted" icon={Star} entries={data?.mostTrusted ?? []} showRating />
            <Section title="Newcomer of the Month 🌟" icon={Users} entries={(data as any)?.newcomers ?? []} />
          </div>
        )}

        <div className="mt-8 rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 inline mr-1 text-primary" />
            Verified badge ({" "}
            <span className="font-medium text-primary">
              <ShieldCheck className="w-3 h-3 inline" />
            </span>
            {" "}) is awarded to trusted sellers with a strong trade history.
          </p>
        </div>
      </div>
    </Layout>
  );
}
