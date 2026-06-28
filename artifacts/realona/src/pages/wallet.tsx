import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetWalletBalance, useGetVirtualAccount, useGetDeposits, useGetWithdrawals, useRequestWithdrawal } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Copy, Wallet, ArrowDownCircle, ArrowUpCircle, Building2, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: walletData } = useGetWalletBalance();
  const { data: va, isLoading: vaLoading } = useGetVirtualAccount();
  const { data: deposits } = useGetDeposits();
  const { data: withdrawals } = useGetWithdrawals();
  const withdrawMutation = useRequestWithdrawal();

  const [wAmount, setWAmount] = useState("");
  const [wBank, setWBank] = useState("");
  const [wAccNum, setWAccNum] = useState("");
  const [wAccName, setWAccName] = useState("");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Account number copied to clipboard." });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(wAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    withdrawMutation.mutate(
      { data: { amount, bankName: wBank, accountNumber: wAccNum, accountName: wAccName } },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal requested!", description: "Admin will process it shortly." });
          queryClient.invalidateQueries({ queryKey: ["getWithdrawals"] });
          queryClient.invalidateQueries({ queryKey: ["getWalletBalance"] });
          setWAmount(""); setWBank(""); setWAccNum(""); setWAccName("");
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err?.data?.error ?? err?.message ?? "Something went wrong.", variant: "destructive" });
        },
      }
    );
  };

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground mb-8">Manage your funds on Realona Exchange.</p>

        {/* Balance Card */}
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-primary">{walletData ? formatNaira(walletData.balance) : "..."}</p>
              <p className="text-xs text-muted-foreground mt-2">{user?.username} · {user?.email}</p>
            </div>
            <Wallet className="w-16 h-16 text-primary/20" />
          </CardContent>
        </Card>

        <Tabs defaultValue="deposit">
          <TabsList className="mb-6">
            <TabsTrigger value="deposit"><ArrowDownCircle className="w-4 h-4 mr-2" />Deposit</TabsTrigger>
            <TabsTrigger value="withdraw"><ArrowUpCircle className="w-4 h-4 mr-2" />Withdraw</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Your Virtual Account</CardTitle>
                <CardDescription>Transfer money to this account number to fund your Realona wallet. Deposits reflect within 5 minutes.</CardDescription>
              </CardHeader>
              <CardContent>
                {vaLoading ? (
                  <div className="h-32 animate-pulse bg-muted rounded-lg" />
                ) : va ? (
                  <div className="space-y-4">
                    <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bank Name</p>
                          <p className="text-lg font-semibold">{va.bankName}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Number</p>
                          <p className="text-3xl font-bold tracking-widest text-primary">{va.accountNumber}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(va.accountNumber)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Name</p>
                        <p className="font-medium">Realona / {user?.username}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        This is your dedicated account. <strong>Always use this account</strong> for all deposits — no other account will work.
                      </p>
                    </div>

                    {/* Recent deposits */}
                    {deposits && deposits.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Recent Deposits</h3>
                        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                          {deposits.slice(0, 5).map(d => (
                            <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-card">
                              <div>
                                <p className="font-semibold text-green-500">+{formatNaira(d.amount)}</p>
                                <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                              </div>
                              {statusBadge(d.status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Unable to load virtual account. Please refresh.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-primary" />Request Withdrawal</CardTitle>
                <CardDescription>Enter your bank details. Admin will process the transfer within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Amount (₦)</label>
                    <Input
                      type="number"
                      min="100"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={wAmount}
                      onChange={e => setWAmount(e.target.value)}
                      required
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {walletData ? formatNaira(walletData.balance) : "..."}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Bank Name</label>
                    <Input
                      placeholder="e.g. Access Bank"
                      value={wBank}
                      onChange={e => setWBank(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                    <Input
                      placeholder="10-digit account number"
                      maxLength={10}
                      value={wAccNum}
                      onChange={e => setWAccNum(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account Name</label>
                    <Input
                      placeholder="John Doe"
                      value={wAccName}
                      onChange={e => setWAccName(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={withdrawMutation.isPending}>
                    {withdrawMutation.isPending ? "Submitting..." : "Request Withdrawal"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="space-y-6">
              {/* Withdrawal history */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!withdrawals || withdrawals.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No withdrawals yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {withdrawals.map(w => (
                        <div key={w.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-red-400">-{formatNaira(w.amount)}</p>
                            <p className="text-xs text-muted-foreground">{w.bankName} · {w.accountNumber}</p>
                            <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                            {w.rejectionReason && <p className="text-xs text-red-400 mt-1">{w.rejectionReason}</p>}
                          </div>
                          {statusBadge(w.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deposit history */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Deposit History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!deposits || deposits.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No deposits yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {deposits.map(d => (
                        <div key={d.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-green-500">+{formatNaira(d.amount)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                          </div>
                          {statusBadge(d.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
