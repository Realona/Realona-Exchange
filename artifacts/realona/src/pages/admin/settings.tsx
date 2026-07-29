import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetPlatformFee, useUpdatePlatformFee, useGetAdmins, useCreateAdmin, useGetBulkListingSettings, useUpdateBulkListingSettings } from "@workspace/api-client-react";
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
  const [bulkMaxImages, setBulkMaxImages] = useState("");
  const [bulkMinPrice, setBulkMinPrice] = useState("");

  const { data: feeData } = useGetPlatformFee();
  const { data: admins } = useGetAdmins();
  const { data: bulkSettings } = useGetBulkListingSettings();
  const updateFee = useUpdatePlatformFee();
  const createAdmin = useCreateAdmin();
  const updateBulkSettings = useUpdateBulkListingSettings();

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

  const handleUpdateBulkSettings = (updates: { enabled?: boolean; maxImages?: number; minPrice?: number }) => {
    updateBulkSettings.mutate({ data: updates }, {
      onSuccess: () => { toast({ title: "Bulk listing settings updated" }); queryClient.invalidateQueries({ queryKey: ["getBulkListingSettings"] }); },
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

        {/* Bulk Listing */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Bulk Listing</CardTitle>
            <CardDescription>
              Control whether sellers can list multiple accounts at once.
              Current: <strong>{bulkSettings?.enabled ? "Enabled" : "Disabled"}</strong> ·
              Max images: <strong>{bulkSettings?.maxImages ?? "…"}</strong> ·
              Min price: <strong>₦{(bulkSettings?.minPrice ?? 0).toLocaleString()}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <Button
                variant={bulkSettings?.enabled ? "destructive" : "default"}
                size="sm"
                disabled={updateBulkSettings.isPending}
                onClick={() => handleUpdateBulkSettings({ enabled: !bulkSettings?.enabled })}
              >
                {bulkSettings?.enabled ? "Disable Bulk Listing" : "Enable Bulk Listing"}
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updates: Record<string, number> = {};
                if (bulkMaxImages) updates.maxImages = parseInt(bulkMaxImages, 10);
                if (bulkMinPrice) updates.minPrice = parseFloat(bulkMinPrice);
                if (Object.keys(updates).length > 0) handleUpdateBulkSettings(updates);
                setBulkMaxImages("");
                setBulkMinPrice("");
              }}
              className="flex gap-3 flex-wrap items-end"
            >
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max images per batch</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  placeholder={`Current: ${bulkSettings?.maxImages ?? "…"}`}
                  value={bulkMaxImages}
                  onChange={(e) => setBulkMaxImages(e.target.value)}
                  className="bg-background w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Minimum price (₦)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder={`Current: ₦${(bulkSettings?.minPrice ?? 0).toLocaleString()}`}
                  value={bulkMinPrice}
                  onChange={(e) => setBulkMinPrice(e.target.value)}
                  className="bg-background w-44"
                />
              </div>
              <Button type="submit" size="sm" disabled={updateBulkSettings.isPending || (!bulkMaxImages && !bulkMinPrice)}>
                {updateBulkSettings.isPending ? "Saving…" : "Update Limits"}
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
