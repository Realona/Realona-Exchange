import { useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetKycStatus, useSubmitKyc } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Upload, CheckCircle, Clock, XCircle, Loader2, FileText } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { useState } from "react";

const DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID (NIN)" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_license", label: "Driver's License" },
];

function KycLevelBadge({ level }: { level: number }) {
  if (level === 0) return <Badge variant="outline" className="border-gray-500/30 text-muted-foreground">Unverified</Badge>;
  if (level === 1) return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Level 1 — Verified</Badge>;
  return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Level 2 — Fully Verified</Badge>;
}

export default function KYCPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  const { data: kycStatus, isLoading } = useGetKycStatus();
  const submitKyc = useSubmitKyc();

  // Two separate upload instances — one per file slot
  const { uploadFile: uploadDoc, isUploading: docUploading } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const url = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      setDocUrl(url);
      toast({ title: "Document uploaded!" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const { uploadFile: uploadSelfie, isUploading: selfieUploading } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const url = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      setSelfieUrl(url);
      toast({ title: "Selfie uploaded!" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDoc(file);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleSelfieChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadSelfie(file);
    if (selfieInputRef.current) selfieInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!docType || !docUrl) {
      toast({ title: "Document type and document image are required", variant: "destructive" });
      return;
    }
    submitKyc.mutate(
      { data: { documentType: docType, documentUrl: docUrl, selfieUrl: selfieUrl || undefined } },
      {
        onSuccess: () => {
          toast({ title: "KYC submitted!", description: "Admin will review your documents shortly." });
          queryClient.invalidateQueries({ queryKey: ["getKycStatus"] });
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  const submission = kycStatus?.submission;
  const kycLevel = kycStatus?.kycLevel ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            KYC Verification
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Verify your identity to unlock higher trading limits.</p>
        </div>

        {/* Current level */}
        <Card className="border-border bg-card mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Current Status</span>
              <KycLevelBadge level={kycLevel} />
            </div>
            {submission && (
              <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                submission.status === "approved" ? "bg-green-500/10 text-green-500" :
                submission.status === "rejected" ? "bg-red-500/10 text-red-500" :
                "bg-yellow-500/10 text-yellow-500"
              }`}>
                {submission.status === "approved" ? <CheckCircle className="w-4 h-4" /> :
                 submission.status === "rejected" ? <XCircle className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
                {submission.status === "approved" ? "Verification approved!" :
                 submission.status === "rejected" ? `Rejected: ${submission.adminNote ?? "No reason given"}` :
                 "Under review — usually within 24 hours"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KYC level perks */}
        <Card className="border-border bg-card mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">What verification unlocks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { level: "Level 1 (ID only)", perks: "Verified badge · Higher withdrawal limits · Trusted seller tag" },
              { level: "Level 2 (ID + Selfie)", perks: "Full verification badge · Priority support · Max trading limits" },
            ].map((item) => (
              <div key={item.level} className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{item.level}</p>
                  <p className="text-xs text-muted-foreground">{item.perks}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit form — only show if not approved and no pending */}
        {kycLevel === 0 && submission?.status !== "pending" && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submit Verification</CardTitle>
              <CardDescription>Upload a government-issued ID document to get verified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Document Image</label>
                <input ref={docInputRef} type="file" accept="image/*" className="hidden" onChange={handleDocChange} />
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50 ${docUrl ? "border-green-500/30 bg-green-500/5" : "border-border"}`}
                  onClick={() => docInputRef.current?.click()}
                >
                  {docUploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                  ) : docUrl ? (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Document uploaded</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">Click to upload ID document (PNG, JPG)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selfie upload (optional) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Selfie <span className="text-muted-foreground text-xs">(optional — for Level 2)</span>
                </label>
                <input ref={selfieInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelfieChange} />
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50 ${selfieUrl ? "border-green-500/30 bg-green-500/5" : "border-border"}`}
                  onClick={() => selfieInputRef.current?.click()}
                >
                  {selfieUploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                  ) : selfieUrl ? (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Selfie uploaded</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">Click to upload a selfie of yourself</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!docType || !docUrl || submitKyc.isPending}
              >
                {submitKyc.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Submit for Review
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
