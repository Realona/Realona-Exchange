import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, Star, TrendingUp, Users } from "lucide-react";
import { VerificationBadges } from "@/components/verification-badges";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardList({ entries, showRating = false }: { entries: any[]; showRating?: boolean }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No data yet. Complete trades to appear here.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((e: any) => {
        const medal = RANK_MEDALS[e.rank];
        const isTop3 = e.rank <= 3;
        return (
          <div
            key={e.userId}
            className={`flex items-center gap-3 px-3 py-3 transition-colors ${
              isTop3 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
            }`}
          >
            {/* Rank */}
            <span className="w-8 shrink-0 text-center text-base font-bold">
              {medal ?? <span className="text-sm text-muted-foreground">#{e.rank}</span>}
            </span>

            {/* Username */}
            <p className={`flex-1 text-sm font-semibold flex items-center gap-1.5 min-w-0 truncate ${isTop3 ? "text-foreground" : ""}`}>
              {e.username}
              <VerificationBadges isVerifiedTrader={e.isVerified} kycLevel={e.kycLevel} />
            </p>

            {/* Stats */}
            <div className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
              {showRating ? (
                <>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-foreground">
                      {e.rating ? Number(e.rating).toFixed(1) : "—"}
                    </span>
                  </div>
                  <span>({e.count} ratings)</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-foreground">{e.count}</span>
                  <span>trades</span>
                  {e.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span>{Number(e.rating).toFixed(1)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  entries,
  showRating = false,
}: {
  title: string;
  icon: React.ElementType;
  entries: any[];
  showRating?: boolean;
}) {
  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <LeaderboardList entries={entries} showRating={showRating} />
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useGetLeaderboard();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">
            Nigeria's top eFootball account traders, ranked by performance.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Section title="Top Sellers" icon={TrendingUp} entries={data?.topSellers ?? []} />
            <Section title="Top Buyers" icon={Users} entries={data?.topBuyers ?? []} />
            <Section title="Most Trusted" icon={Star} entries={data?.mostTrusted ?? []} showRating />
            <Section
              title="Newcomer of the Month 🌟"
              icon={Users}
              entries={(data as any)?.newcomers ?? []}
            />
          </div>
        )}

        <div className="mt-6 rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Green ticks mark Verified Traders with trusted activity. Blue ticks confirm approved ID verification.
          </p>
        </div>
      </div>
    </Layout>
  );
}
