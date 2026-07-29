import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAdminDeposits, useConfirmDeposit } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

function AdminNav({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
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
    ...(isSuperAdmin ? [{ href: "/admin/settings", label: "Settings" }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-4">
      {navLinks.map((l) => (
        <Link key={l.href} href={l.href}>
          <Button variant={location.pathname === l.href ? "default" : "ghost"} size="sm" className="h-7 text-xs">
            {l.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

export default function AdminDeposits() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deposits, isLoading } = useGetAdminDeposits(
    { status: statusFilter || undefined },
    { query: { queryKey: ["getAdminDeposits", statusFilter] } }
  );
  const confirm = useConfirmDeposit();

  const handleConfirm = (id: number, amount: number, username: string) => {
    confirm.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Deposit confirmed!", description: `${formatNaira(amount - 50)} credited to ${username}'s wallet.` });
          queryClient.invalidateQueries({ queryKey: ["getAdminDeposits"] });
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <AdminNav />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Deposits
          </h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : !deposits?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {statusFilter || ""} deposits found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deposits.map((dep: any) => (
              <Card key={dep.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{dep.username ?? `User #${dep.userId}`}</span>
                      <Badge variant="outline" className={dep.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-green-500/10 text-green-500 border-green-500/20"
                      }>
                        {dep.status === "pending" ? <Clock className="w-3 h-3 mr-1 inline" /> : <CheckCircle className="w-3 h-3 mr-1 inline" />}
                        {dep.status === "pending" ? "Pending" : "Completed"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ref: <span className="font-mono">{dep.reference}</span>
                      <span className="mx-2">·</span>
                      {new Date(dep.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatNaira(dep.amount)}</p>
                      {dep.status === "pending" && (
                        <p className="text-xs text-muted-foreground">-₦50 = {formatNaira(dep.amount - 50)}</p>
                      )}
                    </div>
                    {dep.status === "pending" && (
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleConfirm(dep.id, dep.amount, dep.username ?? "")}
                        disabled={confirm.isPending}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirm
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
