import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAdminGiveaways, useCreateGiveaway, useUpdateGiveaway, useGetGiveawayClaims } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, ToggleLeft, ToggleRight, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

const TASK_TYPES = [
  { value: "registration", label: "Registration" },
  { value: "first_trade", label: "First Trade" },
  { value: "first_listing", label: "First Listing" },
  { value: "referral", label: "Referral" },
];

function ClaimsPanel({ giveawayId }: { giveawayId: number }) {
  const { data: claims, isLoading } = useGetGiveawayClaims(giveawayId);
  if (isLoading) return <div className="px-4 pb-3 text-xs text-muted-foreground animate-pulse">Loading claims…</div>;
  if (!claims?.length) return <div className="px-4 pb-3 text-xs text-muted-foreground italic">No claims yet.</div>;
  return (
    <div className="border-t border-border mt-1">
      <div className="px-4 py-2 grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>User</span><span>Email</span><span>Claimed At</span>
      </div>
      {(claims as any[]).map((c: any) => (
        <div key={c.id} className="px-4 py-1.5 grid grid-cols-3 gap-2 text-xs border-t border-border/50 hover:bg-muted/30">
          <span className="font-medium truncate">{c.username}</span>
          <span className="text-muted-foreground truncate">{c.email}</span>
          <span className="text-muted-foreground">{new Date(c.claimedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminGiveaways() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "", description: "", rewardAmount: "", maxUsers: "", taskType: "registration", expiresAt: "",
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: giveaways, isLoading } = useGetAdminGiveaways();
  const create = useCreateGiveaway();
  const update = useUpdateGiveaway();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["getAdminGiveaways"] });

  const handleCreate = () => {
    if (!form.title || !form.rewardAmount || !form.maxUsers) {
      toast({ title: "Title, reward amount, and max users are required", variant: "destructive" }); return;
    }
    create.mutate(
      {
        data: {
          title: form.title,
          description: form.description || undefined,
          rewardAmount: Number(form.rewardAmount),
          maxUsers: Number(form.maxUsers),
          taskType: form.taskType as import("@workspace/api-client-react").GiveawayInputTaskType,
          expiresAt: form.expiresAt || undefined,
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Giveaway created!" });
          setForm({ title: "", description: "", rewardAmount: "", maxUsers: "", taskType: "registration", expiresAt: "" });
          invalidate();
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleToggle = (id: number, isActive: boolean) => {
    const g = (giveaways as any[])?.find((x: any) => x.id === id);
    if (!g) return;
    update.mutate({ id, data: { title: g.title, rewardAmount: g.rewardAmount, maxUsers: g.maxUsers, taskType: g.taskType, description: g.description ?? undefined, expiresAt: g.expiresAt ?? undefined, isActive: !isActive } }, {
      onSuccess: () => { toast({ title: !isActive ? "Giveaway activated." : "Giveaway paused." }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const taskLabel = (t: string) => TASK_TYPES.find(x => x.value === t)?.label ?? t;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-4">
          {["/admin", "/admin/users", "/admin/trades", "/admin/withdrawals", "/admin/deposits", "/admin/kyc-review", "/admin/announcements", "/admin/giveaways", "/admin/reports"].map((href) => (
            <Link key={href} href={href}>
              <Button variant="ghost" size="sm" className="h-7 text-xs capitalize">{href.split("/admin/")[1] ?? "Overview"}</Button>
            </Link>
          ))}
        </div>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Gift className="w-6 h-6 text-primary" />
          Giveaways &amp; Rewards
        </h1>

        {/* Create form */}
        <Card className="border-border bg-card mb-8">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />New Giveaway</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              <Select value={form.taskType} onValueChange={(v) => setForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reward Amount (₦)</label>
                <Input type="number" placeholder="e.g. 500" value={form.rewardAmount} onChange={(e) => setForm(f => ({ ...f, rewardAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Users</label>
                <Input type="number" placeholder="e.g. 100" value={form.maxUsers} onChange={(e) => setForm(f => ({ ...f, maxUsers: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expiry Date (optional)</label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={create.isPending} className="w-full sm:w-auto">
              <Gift className="w-4 h-4 mr-2" />Create Giveaway
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : !giveaways?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No giveaways yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {giveaways.map((g: any) => (
              <Card key={g.id} className={`border-border bg-card ${!g.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{g.title}</span>
                      <Badge variant="outline" className="text-xs">{taskLabel(g.taskType)}</Badge>
                      <Badge variant="outline" className={g.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}>
                        {g.isActive ? "Active" : g.claimedCount >= g.maxUsers ? "Exhausted" : "Paused"}
                      </Badge>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground mb-2">{g.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="font-semibold text-primary">{formatNaira(g.rewardAmount)} reward</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{g.claimedCount}/{g.maxUsers} claimed</span>
                      {g.expiresAt && <span>Expires: {new Date(g.expiresAt).toLocaleDateString("en-NG")}</span>}
                      {g.claimedCount > 0 && (
                        <button
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                        >
                          {expandedId === g.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedId === g.id ? "Hide claims" : `View ${g.claimedCount} claim${g.claimedCount !== 1 ? "s" : ""}`}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => handleToggle(g.id, g.isActive)}
                    disabled={update.isPending}
                    title={g.isActive ? "Pause giveaway" : "Reactivate giveaway"}
                  >
                    {g.isActive
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    }
                  </Button>
                </CardContent>
                {expandedId === g.id && <ClaimsPanel giveawayId={g.id} />}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
