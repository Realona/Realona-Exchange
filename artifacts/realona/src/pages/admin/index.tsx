import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useGetAdminStats } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ArrowRightLeft, Wallet, TrendingUp, AlertTriangle, Clock } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { data: stats } = useGetAdminStats();

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
        </div>
      </Layout>
    );
  }

  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/trades", label: "Trades" },
    { href: "/admin/withdrawals", label: "Withdrawals" },
    { href: "/admin/deposits", label: "Deposits" },
    { href: "/admin/kyc-review", label: "KYC Review" },
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/giveaways", label: "Giveaways" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/reviews", label: "Reviews" },
  ];
  if (user.isSuperAdmin) navLinks.push({ href: "/admin/settings", label: "Settings" });

  return (
    <Layout>
      <div className="border-b border-border bg-card mb-6">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  location === link.href ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground text-sm">Platform health at a glance.</p>
        </div>

        {stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
            <StatCard title="Total Trades" value={stats.totalTrades} icon={ArrowRightLeft} />
            <StatCard title="Escrow Balance" value={formatNaira(stats.escrowBalance)} sub="Funds in active trades" icon={Wallet} color="text-blue-500" />
            <StatCard title="Platform Earnings" value={formatNaira(stats.platformEarnings)} sub="All time fees collected" icon={TrendingUp} color="text-green-500" />
            <StatCard title="Pending Disputes" value={stats.pendingDisputes ?? 0} icon={AlertTriangle} color={(stats.pendingDisputes ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"} />
            <StatCard title="Pending Withdrawals" value={stats.pendingWithdrawals ?? 0} icon={Clock} color={(stats.pendingWithdrawals ?? 0) > 0 ? "text-yellow-500" : "text-muted-foreground"} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
