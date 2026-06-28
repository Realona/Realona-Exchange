import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useGetAdminReports, useResolveReport } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdminNav } from "./users";
import { Link } from "wouter";

export default function AdminReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: reports } = useGetAdminReports();
  const resolveReport = useResolveReport();

  const handleResolve = () => {
    if (!resolveId || !resolution.trim()) return;
    resolveReport.mutate({ id: resolveId, data: { resolution: resolution.trim() } }, {
      onSuccess: () => {
        toast({ title: "Report resolved" });
        queryClient.invalidateQueries({ queryKey: ["getAdminReports"] });
        setResolveId(null);
        setResolution("");
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">User Reports</h1>
          <p className="text-muted-foreground text-sm">Review and resolve reports submitted by users.</p>
        </div>

        <div className="space-y-3">
          {!reports ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No reports yet.</p>
          ) : reports.map(r => (
            <Card key={r.id} className={`border-border bg-card ${r.status === "pending" ? "border-yellow-500/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={r.status === "pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs" : "bg-green-500/10 text-green-500 border-green-500/20 text-xs"}>
                        {r.status}
                      </Badge>
                      <span className="text-sm"><strong>{r.reporterUsername}</strong> reported <strong>{r.reportedUsername}</strong></span>
                      {r.tradeId && (
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                          <Link href={`/trades/${r.tradeId}`}>Trade #{r.tradeId}</Link>
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.reason}</p>
                    {r.evidence && <p className="text-xs text-muted-foreground mt-1 italic">Evidence: {r.evidence}</p>}
                    {r.resolution && <p className="text-xs text-green-500 mt-1">Resolution: {r.resolution}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  {r.status === "pending" && (
                    <Button size="sm" onClick={() => setResolveId(r.id)}>Resolve</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={resolveId !== null} onOpenChange={open => !open && setResolveId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the resolution taken..."
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={resolveReport.isPending || !resolution.trim()}>
              {resolveReport.isPending ? "Saving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
