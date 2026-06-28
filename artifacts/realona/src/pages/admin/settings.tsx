import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetPlatformFee, useUpdatePlatformFee, useGetAdmins, useCreateAdmin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdminNav } from "./users";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fee, setFee] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const { data: feeData } = useGetPlatformFee();
  const { data: admins } = useGetAdmins();
  const updateFee = useUpdatePlatformFee();
  const createAdmin = useCreateAdmin();

  if (!user?.isSuperAdmin) {
    return (
      <Layout>
        <AdminNav />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Super admin access required.</p>
        </div>
      </Layout>
    );
  }

  const handleUpdateFee = (e: React.FormEvent) => {
    e.preventDefault();
    const feePercent = parseFloat(fee);
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      toast({ title: "Invalid fee", description: "Must be between 0 and 100.", variant: "destructive" });
      return;
    }
    updateFee.mutate({ data: { feePercent } }, {
      onSuccess: () => { toast({ title: "Fee updated" }); queryClient.invalidateQueries({ queryKey: ["getPlatformFee"] }); setFee(""); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = parseInt(adminUserId, 10);
    if (isNaN(userId)) { toast({ title: "Invalid user ID", variant: "destructive" }); return; }
    createAdmin.mutate({ data: { userId, isSuperAdmin } }, {
      onSuccess: () => {
        toast({ title: "Admin created" });
        queryClient.invalidateQueries({ queryKey: ["getAdmins"] });
        setAdminUserId("");
        setIsSuperAdmin(false);
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>

        {/* Platform fee */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Platform Fee</CardTitle>
            <CardDescription>Current fee: <strong>{feeData?.feePercent ?? "..."}%</strong>. Deducted from seller earnings on trade completion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateFee} className="flex gap-3">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder={`Current: ${feeData?.feePercent ?? "..."}%`}
                value={fee}
                onChange={e => setFee(e.target.value)}
                className="bg-background max-w-[200px]"
              />
              <Button type="submit" disabled={updateFee.isPending}>
                {updateFee.isPending ? "Saving..." : "Update Fee"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Admin management */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Admin Accounts</CardTitle>
            <CardDescription>Grant admin or super admin access to a user by their ID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateAdmin} className="flex gap-3 flex-wrap">
              <Input
                type="number"
                placeholder="User ID"
                value={adminUserId}
                onChange={e => setAdminUserId(e.target.value)}
                className="bg-background w-36"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isSuperAdmin} onChange={e => setIsSuperAdmin(e.target.checked)} />
                Super Admin
              </label>
              <Button type="submit" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? "Granting..." : "Grant Access"}
              </Button>
            </form>

            {admins && admins.length > 0 && (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {admins.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-card/50">
                    <div>
                      <span className="font-medium">{a.username}</span>
                      <span className="text-muted-foreground text-sm ml-2">{a.email}</span>
                    </div>
                    {a.isSuperAdmin ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">Super Admin</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">Admin</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
