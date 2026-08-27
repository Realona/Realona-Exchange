import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGetAdminKycSubmissions, useApproveKyc, useRejectKyc } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { Link } from "wouter";

function statusBadge(status: string) {
  const s: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  return <Badge variant="outline" className={s[status] ?? ""}>{status}</Badge>;
}

function ProtectedKycImage({ src, alt }: { src: string; alt: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    const isLocalProtectedObject =
      src.startsWith("/api/storage/objects/") &&
      !src.includes("?") &&
      !src.includes("#") &&
      !src.includes("\\");
    if (!isLocalProtectedObject) {
      setFailed(true);
      return () => {
        active = false;
      };
    }

    const token = localStorage.getItem("realona_token");
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load protected image");
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (failed) {
    return <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">Unable to load image</div>;
  }
  if (!objectUrl) {
    return <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />;
  }
  return (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer" className="block">
      <img src={objectUrl} alt={alt} className="h-40 w-full rounded-lg border border-border object-cover transition-opacity hover:opacity-90" />
      <p className="mt-1 flex items-center gap-1 text-xs text-primary"><ExternalLink className="h-3 w-3" />View full size</p>
    </a>
  );
}

export default function AdminKycReview() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useGetAdminKycSubmissions(
    { status: statusFilter || undefined },
    { query: { queryKey: ["getAdminKycSubmissions", statusFilter] } }
  );
  const approve = useApproveKyc();
  const reject = useRejectKyc();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["getAdminKycSubmissions"] });

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "KYC approved!" }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleReject = () => {
    if (!rejectDialogId) return;
    reject.mutate(
      { id: rejectDialogId, data: { reason: rejectNote || "Rejected by admin" } },
      {
        onSuccess: () => { toast({ title: "KYC rejected." }); invalidate(); setRejectDialogId(null); setRejectNote(""); },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const docTypeLabel: Record<string, string> = {
    national_id: "National ID",
    passport: "Passport",
    drivers_license: "Driver's License",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-4">
          {["/admin", "/admin/users", "/admin/trades", "/admin/withdrawals", "/admin/deposits", "/admin/kyc-review", "/admin/announcements", "/admin/giveaways", "/admin/reports"].map((href) => (
            <Link key={href} href={href}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">{href.split("/admin/")[1] ?? "Overview"}</Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            KYC Review
          </h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : !submissions?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {statusFilter || ""} KYC submissions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s: any) => (
              <Card key={s.id} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{s.username ?? `User #${s.userId}`}</span>
                        {statusBadge(s.status)}
                        <Badge variant="outline" className="text-xs">Level {s.level}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {docTypeLabel[s.documentType] ?? s.documentType}
                        <span className="mx-2">·</span>
                        {new Date(s.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </p>
                      {s.adminNote && (
                        <p className="text-xs text-red-500 mt-1">Note: {s.adminNote}</p>
                      )}
                    </div>
                    {s.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8" onClick={() => handleApprove(s.id)} disabled={approve.isPending}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8" onClick={() => setRejectDialogId(s.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Document</p>
                      <ProtectedKycImage src={s.documentUrl} alt="Document" />
                    </div>
                    {s.selfieUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Selfie with ID</p>
                        <ProtectedKycImage src={s.selfieUrl} alt="Selfie" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={rejectDialogId !== null} onOpenChange={(v) => { if (!v) setRejectDialogId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject KYC Submission</DialogTitle></DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Reason for rejection (optional)</label>
              <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. Document image is blurry" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
