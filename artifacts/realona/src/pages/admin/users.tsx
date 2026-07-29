import { useState } from "react";
import { Layout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAdminUsers, useSuspendUser, useAdjustUserBalance, useCreateDemoAccount, useDeleteDemoAccount, useGetDemoAccounts } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserX, UserCheck, Wallet, FlaskConical, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth as useAuthCtx } from "@/hooks/use-auth";

function AdminNav() {
  const [location] = useLocation();
  const { user } = useAuthCtx();
  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/trades", label: "Trades" },
    { href: "/admin/withdrawals", label: "Withdrawals" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/reviews", label: "Reviews" },
  ];
  if (user?.isSuperAdmin) navLinks.push({ href: "/admin/settings", label: "Settings" });
  return (
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
  );
}

export { AdminNav };

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [balanceUserId, setBalanceUserId] = useState<number | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoUsername, setDemoUsername] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");

  const { data: users } = useGetAdminUsers({ search: search || undefined });
  const { data: demoAccounts, refetch: refetchDemo } = useGetDemoAccounts();
  const suspendMutation = useSuspendUser();
  const adjustBalance = useAdjustUserBalance();
  const createDemo = useCreateDemoAccount();
  const deleteDemo = useDeleteDemoAccount();

  const handleSuspend = (id: number, suspended: boolean) => {
    suspendMutation.mutate({ id, data: { suspended } }, {
      onSuccess: () => {
        toast({ title: suspended ? "User suspended" : "User unsuspended" });
        queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleCreateDemo = () => {
    if (!demoUsername || !demoEmail || !demoPassword) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    createDemo.mutate({ data: { username: demoUsername, email: demoEmail, password: demoPassword } }, {
      onSuccess: () => {
        toast({ title: "Demo account created", description: `${demoUsername} can now log in.` });
        setDemoOpen(false); setDemoUsername(""); setDemoEmail(""); setDemoPassword("");
        refetchDemo();
        queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.response?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleDeleteDemo = (id: number, username: string) => {
    deleteDemo.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Demo account deleted", description: `${username} has been removed.` });
        refetchDemo();
        queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.response?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleAdjustBalance = () => {
    if (!balanceUserId) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    adjustBalance.mutate({ id: balanceUserId, data: { amount, reason: "Admin balance adjustment" } }, {
      onSuccess: () => {
        toast({ title: "Balance adjusted" });
        queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
        setBalanceUserId(null);
        setBalanceAmount("");
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Users</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setDemoOpen(true)}>
              <FlaskConical className="w-4 h-4" />
              Create Demo Account
            </Button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {!users ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
          ) : users.map(u => (
            <Card key={u.id} className="border-border bg-card">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{u.username}</span>
                    <span className="text-muted-foreground text-sm">{u.email}</span>
                    {u.isSuperAdmin && <Badge className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20" variant="outline">Super Admin</Badge>}
                    {u.isAdmin && !u.isSuperAdmin && <Badge className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">Admin</Badge>}
                    {(u as any).isDemo && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20"><FlaskConical className="w-2.5 h-2.5 mr-1" />Demo</Badge>}
                    {u.isSuspended && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>}
                  </div>
                  <p className="text-sm text-primary font-medium">{formatNaira(u.walletBalance)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBalanceUserId(u.id)}
                    title="Adjust Balance"
                  >
                    <Wallet className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={u.isSuspended ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"}
                    onClick={() => handleSuspend(u.id, !u.isSuspended)}
                    disabled={suspendMutation.isPending || u.id === user?.id}
                  >
                    {u.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    {u.isSuspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Demo Accounts Section */}
        {demoAccounts && demoAccounts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-500" />
              Demo / Test Accounts
            </h2>
            <div className="space-y-2">
              {demoAccounts.map((u: any) => (
                <Card key={u.id} className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold">{u.username}</span>
                        <span className="text-muted-foreground text-sm">{u.email}</span>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                          <FlaskConical className="w-2.5 h-2.5 mr-1" />Demo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Created {new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => handleDeleteDemo(u.id, u.username)}
                      disabled={deleteDemo.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Demo Account Dialog */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-500" />
              Create Demo Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This account can log in normally and is labelled "Demo" in the users list.</p>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="e.g. demo_buyer" value={demoUsername} onChange={e => setDemoUsername(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="demo@example.com" value={demoEmail} onChange={e => setDemoEmail(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Min. 6 characters" value={demoPassword} onChange={e => setDemoPassword(e.target.value)} className="bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemoOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDemo} disabled={createDemo.isPending}>
              <Plus className="w-4 h-4 mr-1.5" />
              {createDemo.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={balanceUserId !== null} onOpenChange={open => !open && setBalanceUserId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter a positive amount to credit, or negative to debit.</p>
            <Input
              type="number"
              placeholder="e.g. 5000 or -1000"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceUserId(null)}>Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={adjustBalance.isPending}>
              {adjustBalance.isPending ? "Adjusting..." : "Adjust"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
