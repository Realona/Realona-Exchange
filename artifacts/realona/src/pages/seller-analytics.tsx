import { Layout } from "@/components/layout";
import { useGetSellerAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNaira } from "@/lib/utils";
import {
  ResponsiveContainer,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
  ComposedChart
} from "recharts";
import {
  Eye,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  AlertCircle,
  Tag
} from "lucide-react";

const CHART_COLORS = {
  blue: "hsl(221, 70%, 48%)",
  gold: "hsl(38, 92%, 50%)",
  green: "#16a34a",
  red: "#dc2626",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  // Assuming value is already a percentage (e.g., 5.5 for 5.5%)
  return Number(value).toFixed(1) + "%";
}

function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  trendLabel,
  testId 
}: { 
  title: string; 
  value: React.ReactNode; 
  icon: any; 
  trend?: "up" | "down" | "neutral"; 
  trendValue?: string; 
  trendLabel?: string;
  testId: string;
}) {
  return (
    <Card className="border-border bg-card hover:shadow-md transition-shadow duration-200" data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight mb-2 text-foreground truncate">{value}</div>
        {trendValue ? (
          <div className="flex items-center gap-1.5 text-xs">
            {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />}
            {trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />}
            {trend === "neutral" && <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className={
              trend === "up" ? "text-green-600 font-medium" : 
              trend === "down" ? "text-red-600 font-medium" : 
              "text-muted-foreground font-medium"
            }>
              {trendValue}
            </span>
            <span className="text-muted-foreground">{trendLabel}</span>
          </div>
        ) : (
          <div className="h-4" />
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-md p-3 text-sm min-w-[150px]" data-testid="chart-tooltip">
      <div className="font-medium mb-2 border-b border-border pb-1.5">{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-semibold text-foreground">
            {entry.name === "Earnings" 
              ? formatNaira(entry.value)
              : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SellerAnalyticsPage() {
  const { data, isLoading, isError } = useGetSellerAnalytics();

  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center justify-center p-12 text-center border border-destructive/20 rounded-xl bg-destructive/5" data-testid="error-state">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">Failed to load analytics</h2>
            <p className="text-muted-foreground max-w-md mx-auto">We couldn't retrieve your seller data right now. Please try again later or contact support if the issue persists.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 space-y-8" data-testid="loading-state">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="border-border">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const growthTrend = data.growthRate > 0 ? "up" : data.growthRate < 0 ? "down" : "neutral";
  const formattedGrowth = `${data.growthRate > 0 ? "+" : ""}${Number(data.growthRate).toFixed(1)}%`;

  return (
    <Layout>
      <div className="container mx-auto min-w-0 overflow-x-hidden px-4 py-10" data-testid="page-seller-analytics">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Seller Analytics</h1>
          <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">Track your listing performance, views, and overall earnings.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <KPICard
            testId="kpi-total-earnings"
            title="Total Earned"
            value={formatNaira(data.totalEarned)}
            icon={DollarSign}
          />
          <KPICard
            testId="kpi-this-month"
            title="This Month's Earnings"
            value={formatNaira(data.thisMonthEarnings)}
            icon={Activity}
            trend={growthTrend}
            trendValue={formattedGrowth}
            trendLabel="vs last month"
          />
          <KPICard
            testId="kpi-total-sales"
            title="Completed Sales"
            value={formatNumber(data.totalSales)}
            icon={Tag}
          />
          <KPICard
            testId="kpi-avg-price"
            title="Avg. Sale Price"
            value={formatNaira(data.averageSalePrice)}
            icon={TrendingUp}
          />
          <KPICard
            testId="kpi-total-views"
            title="Total Views"
            value={formatNumber(data.totalViews)}
            icon={Eye}
          />
          <KPICard
            testId="kpi-conversion"
            title="Conversion Rate"
            value={formatPercent(data.conversionRate)}
            icon={BarChart3}
          />
        </div>

        {/* Charts */}
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <Card className="min-w-0 lg:col-span-2 border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Monthly Performance</CardTitle>
              <CardDescription>Sales volume and earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlySales.length === 0 ? (
                <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/20" data-testid="empty-chart">
                  <BarChart3 className="w-10 h-10 mb-3 opacity-20" />
                  <p>No sales data available yet.</p>
                </div>
              ) : (
                <div className="h-[320px]" data-testid="chart-monthly-sales">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.monthlySales} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(value) => value >= 1000 ? `₦${(value / 1000)}k` : `₦${value}`}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="earnings" 
                        name="Earnings" 
                        stroke={CHART_COLORS.gold} 
                        fillOpacity={1} 
                        fill="url(#colorEarnings)" 
                        strokeWidth={2}
                      />
                       <Line
                        yAxisId="right"
                        dataKey="sales" 
                        name="Sales" 
                         stroke={CHART_COLORS.blue}
                         strokeWidth={3}
                         dot={{ r: 4, fill: CHART_COLORS.blue }}
                         activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border shadow-sm flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Growth Snapshot</CardTitle>
              <CardDescription>Month over month comparison</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">This Month</p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatNaira(data.thisMonthEarnings)}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last Month</p>
                  <p className="text-2xl font-semibold text-muted-foreground tracking-tight">{formatNaira(data.lastMonthEarnings)}</p>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
                    <span className="text-sm font-semibold">Growth Rate</span>
                    <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                      data.growthRate > 0 ? "bg-green-500/15 text-green-700 dark:text-green-500" :
                      data.growthRate < 0 ? "bg-red-500/15 text-red-700 dark:text-red-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {formattedGrowth}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <Card className="min-w-0 overflow-hidden border-border shadow-sm mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Top Listing Earnings</CardTitle>
            <CardDescription>Compare revenue generated by your ten best-performing listings</CardDescription>
          </CardHeader>
          <CardContent>
            {data.listingPerformance.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/20" data-testid="empty-listing-chart">
                <BarChart3 className="w-10 h-10 mb-3 opacity-20" />
                <p>Create a listing to start comparing performance.</p>
              </div>
            ) : (
              <div className="h-[320px]" data-testid="chart-listing-performance">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.listingPerformance}
                    layout="vertical"
                    margin={{ top: 12, right: 24, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(value) => value >= 1000 ? `₦${Math.round(value / 1000)}k` : `₦${value}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="gameName"
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(value: string) => value.length > 16 ? `${value.slice(0, 16)}…` : value}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                    <Bar dataKey="earnings" name="Earnings" fill={CHART_COLORS.gold} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listing Performance Table */}
        <Card className="min-w-0 overflow-hidden border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Listing Performance</CardTitle>
            <CardDescription>Detailed metrics for your individual listings</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-0 sm:px-6">
            {data.listingPerformance.length === 0 ? (
              <div className="text-center py-12 mx-6 border-2 border-dashed border-border rounded-xl text-muted-foreground bg-muted/10" data-testid="empty-listings">
                <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No active listings available.</p>
                <p className="text-sm mt-1 opacity-70">Create a listing to start tracking its performance.</p>
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm text-left border-collapse" data-testid="table-listing-performance">
                  <thead className="text-xs text-muted-foreground bg-muted/40 border-y border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Listing / Game</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Views</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Sales</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Conversion</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.listingPerformance.map((item) => (
                      <tr key={item.listingId} className="hover:bg-muted/30 transition-colors group" data-testid={`row-listing-${item.listingId}`}>
                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                          {item.gameName}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {formatNumber(item.views)}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {formatNumber(item.sales)}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {formatPercent(item.conversionRate)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground tabular-nums">
                          {formatNaira(item.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
