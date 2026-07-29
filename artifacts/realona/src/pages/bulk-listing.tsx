import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateBulkListings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import {
  ArrowLeft, Upload, X, CheckCircle, Loader2, Layers,
  ImagePlus, Zap, AlertCircle, PackageCheck,
} from "lucide-react";

const SOCIAL_PLATFORMS = ["Instagram", "Twitter/X", "TikTok", "YouTube", "Facebook"];

interface BulkItem {
  id: string;
  file: File;
  localPreview: string;
  serverUrl: string;
  isUploading: boolean;
  uploadError: string;
  category: "efootball" | "social_media";
  price: string;
  description: string;
  konamiId: string;
  konamiPassword: string;
  accessCode: string;
  accountEmail: string;
  accountPassword: string;
  platform: string;
  accountHandle: string;
  followerCount: string;
  recoveryEmail: string;
}

function makeBulkItem(file: File, defaults: Partial<BulkItem> = {}): BulkItem {
  return {
    id: crypto.randomUUID(),
    file,
    localPreview: URL.createObjectURL(file),
    serverUrl: "",
    isUploading: false,
    uploadError: "",
    category: "efootball",
    price: "",
    description: "",
    konamiId: "",
    konamiPassword: "",
    accessCode: "",
    accountEmail: "",
    accountPassword: "",
    platform: "",
    accountHandle: "",
    followerCount: "",
    recoveryEmail: "",
    ...defaults,
  };
}

// ─── Per-item card with its own upload hook ───────────────────────────────────
function BulkItemCard({
  index,
  item,
  minPrice,
  onUpdate,
  onRemove,
  onUploaded,
  onUploadStart,
  onUploadError,
}: {
  index: number;
  item: BulkItem;
  minPrice: number;
  onUpdate: (id: string, field: keyof BulkItem, value: string) => void;
  onRemove: (id: string) => void;
  onUploaded: (id: string, url: string) => void;
  onUploadStart: (id: string) => void;
  onUploadError: (id: string, msg: string) => void;
}) {
  const { toast } = useToast();
  const didUpload = useRef(false);

  const { uploadFile, isUploading } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const url = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      onUploaded(item.id, url);
    },
    onError: (err) => {
      onUploadError(item.id, err.message);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  // Auto-upload the file when this card first mounts
  useEffect(() => {
    if (!didUpload.current && item.file) {
      didUpload.current = true;
      onUploadStart(item.id);
      uploadFile(item.file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEfootball = item.category === "efootball";

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {index + 1}
          </div>
          <CardTitle className="text-sm font-semibold">Account #{index + 1}</CardTitle>
          {item.serverUrl && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/10 gap-1">
              <CheckCircle className="w-3 h-3" /> Uploaded
            </Badge>
          )}
          {(item.isUploading || isUploading) && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/30 bg-blue-500/10 gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
            </Badge>
          )}
          {item.uploadError && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/10 gap-1">
              <AlertCircle className="w-3 h-3" /> Upload failed
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Image preview */}
        <div className="relative rounded-lg overflow-hidden bg-muted border border-border aspect-video">
          <img
            src={item.localPreview}
            alt={`Account ${index + 1} screenshot`}
            className="w-full h-full object-cover"
          />
          {(item.isUploading || isUploading) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
            <Select
              value={item.category}
              onValueChange={(v) => onUpdate(item.id, "category", v)}
            >
              <SelectTrigger className="bg-background h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efootball">eFootball</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Price (₦) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={minPrice}
              placeholder={`Min ₦${minPrice.toLocaleString()}`}
              value={item.price}
              onChange={(e) => onUpdate(item.id, "price", e.target.value)}
              className="bg-background h-9 text-sm"
            />
            {item.price && Number(item.price) < minPrice && (
              <p className="text-xs text-destructive">Min ₦{minPrice.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder={isEfootball
              ? "e.g. 85 OVR, 3100 squad rating, Bellingham, Haaland, great division…"
              : "e.g. 50k followers, high engagement, gaming niche, 2 years old…"}
            value={item.description}
            onChange={(e) => onUpdate(item.id, "description", e.target.value)}
            rows={2}
            className="bg-background text-sm resize-none"
          />
        </div>

        {/* Social media platform picker */}
        {!isEfootball && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Platform <span className="text-destructive">*</span>
            </label>
            <Select value={item.platform} onValueChange={(v) => onUpdate(item.id, "platform", v)}>
              <SelectTrigger className="bg-background h-9 text-sm">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Credentials */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            🔐 Account Credentials
          </p>
          <p className="text-xs text-muted-foreground -mt-1">
            Hidden from buyers until payment is confirmed.
          </p>

          {isEfootball ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Konami ID / Email</label>
                <Input
                  placeholder="Konami ID or email"
                  value={item.konamiId}
                  onChange={(e) => onUpdate(item.id, "konamiId", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Konami Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={item.konamiPassword}
                  onChange={(e) => onUpdate(item.id, "konamiPassword", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">OTP / Access Code</label>
                <Input
                  placeholder="OTP or access code"
                  value={item.accessCode}
                  onChange={(e) => onUpdate(item.id, "accessCode", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Recovery Email (optional)</label>
                <Input
                  type="email"
                  placeholder="backup@email.com"
                  value={item.recoveryEmail}
                  onChange={(e) => onUpdate(item.id, "recoveryEmail", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Account Email</label>
                <Input
                  type="email"
                  placeholder="account@email.com"
                  value={item.accountEmail}
                  onChange={(e) => onUpdate(item.id, "accountEmail", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Account Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={item.accountPassword}
                  onChange={(e) => onUpdate(item.id, "accountPassword", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Account Handle</label>
                <Input
                  placeholder="@username"
                  value={item.accountHandle}
                  onChange={(e) => onUpdate(item.id, "accountHandle", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Follower Count</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={item.followerCount}
                  onChange={(e) => onUpdate(item.id, "followerCount", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Recovery Email (optional)</label>
                <Input
                  type="email"
                  placeholder="backup@email.com"
                  value={item.recoveryEmail}
                  onChange={(e) => onUpdate(item.id, "recoveryEmail", e.target.value)}
                  className="bg-background h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BulkListingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const MAX_IMAGES = 10;
  const MIN_PRICE = 1000;

  const [items, setItems] = useState<BulkItem[]>([]);
  const [quickCategory, setQuickCategory] = useState<"efootball" | "social_media" | "">("");
  const [quickPrice, setQuickPrice] = useState("");
  const [result, setResult] = useState<{ created: number; errors: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createBulkListings = useCreateBulkListings();

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const canAdd = MAX_IMAGES - items.length;
    if (canAdd <= 0) {
      toast({ title: `Maximum ${MAX_IMAGES} accounts per batch`, variant: "destructive" });
      return;
    }
    const toAdd = files.slice(0, canAdd).map((f) =>
      makeBulkItem(f, {
        category: quickCategory || "efootball",
        price: quickPrice,
      })
    );
    setItems((prev) => [...prev, ...toAdd]);
    // reset input so same files can be re-added after removal
    e.target.value = "";
  };

  const updateItem = (id: string, field: keyof BulkItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.localPreview) URL.revokeObjectURL(item.localPreview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const markUploadStart = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isUploading: true, uploadError: "" } : i)));

  const markUploaded = (id: string, url: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, serverUrl: url, isUploading: false } : i)));

  const markUploadError = (id: string, msg: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, uploadError: msg, isUploading: false } : i)));

  const applyQuickFill = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        ...(quickCategory ? { category: quickCategory } : {}),
        ...(quickPrice ? { price: quickPrice } : {}),
      }))
    );
    toast({ title: "Applied to all cards!" });
  };

  const allUploaded = items.length > 0 && items.every((i) => i.serverUrl || i.uploadError);
  const anyUploading = items.some((i) => i.isUploading);

  const validate = (): string | null => {
    if (items.length === 0) return "Add at least one account screenshot.";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description.trim()) return `Account #${i + 1}: description is required.`;
      if (!item.price || Number(item.price) < MIN_PRICE)
        return `Account #${i + 1}: price must be at least ₦${MIN_PRICE.toLocaleString()}.`;
      if (item.category === "social_media" && !item.platform)
        return `Account #${i + 1}: select a platform.`;
    }
    // Check duplicate Konami IDs
    const konamiIds = items.map((i) => i.konamiId).filter(Boolean);
    if (new Set(konamiIds).size !== konamiIds.length)
      return "Duplicate Konami IDs found. Each account must have a unique Konami ID.";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { toast({ title: "Please fix errors", description: err, variant: "destructive" }); return; }

    const payload = items.map((item) => ({
      gameName: item.category === "efootball" ? "eFootball" : (item.platform || "Social Media"),
      category: item.category,
      price: Number(item.price),
      description: item.description.trim(),
      pictureUrl: item.serverUrl || null,
      konamiId: item.konamiId || null,
      konamiPassword: item.konamiPassword || null,
      accessCode: item.accessCode || null,
      accountEmail: item.accountEmail || null,
      accountPassword: item.accountPassword || null,
      platform: item.platform || null,
      accountHandle: item.accountHandle || null,
      followerCount: item.followerCount ? parseInt(item.followerCount, 10) : null,
      recoveryEmail: item.recoveryEmail || null,
    }));

    createBulkListings.mutate(
      { data: { items: payload as any } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: ["getMyListings"] });
          setResult({ created: data.created, errors: data.errors, total: data.total });
          // revoke object URLs
          items.forEach((i) => URL.revokeObjectURL(i.localPreview));
        },
        onError: (err: any) =>
          toast({ title: "Submission failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  // ─── Success screen ───────────────────────────────────────────────────────
  if (result) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <PackageCheck className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bulk Listing Successful!</h1>
          <p className="text-muted-foreground mb-8">
            Your accounts are now live on the marketplace.
          </p>

          <div className="rounded-xl border border-border bg-card p-6 mb-8 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Accounts published</span>
              <span className="font-bold text-green-600">{result.created}</span>
            </div>
            {result.errors > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Errors</span>
                <span className="font-bold text-destructive">{result.errors}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium">Total submitted</span>
              <span className="font-bold">{result.total}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setLocation("/listings/my")} className="gap-2">
              <CheckCircle className="w-4 h-4" /> View My Listings
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setItems([]);
                setResult(null);
              }}
            >
              List More Accounts
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setLocation("/listings/new")}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Bulk Listing
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload up to {MAX_IMAGES} screenshots and list them all at once.
            </p>
          </div>
        </div>

        {/* Upload zone */}
        <div
          className={`rounded-2xl border-2 border-dashed transition-colors mb-6 ${
            items.length >= MAX_IMAGES
              ? "border-muted bg-muted/20 cursor-not-allowed opacity-50"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
          }`}
          onClick={() => items.length < MAX_IMAGES && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilePick}
          />
          <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-full bg-primary/10">
              <ImagePlus className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Click to upload screenshots</p>
              <p className="text-sm mt-0.5">
                {items.length}/{MAX_IMAGES} added · PNG, JPG, WEBP up to 10MB each
              </p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No screenshots added yet</p>
            <p className="text-sm mt-1">Click the upload zone above to add account screenshots.</p>
          </div>
        ) : (
          <>
            {/* Quick Fill bar */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Quick Fill</span>
                <span className="text-xs text-muted-foreground">— apply category or price to all cards at once</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Category for all</label>
                  <Select
                    value={quickCategory}
                    onValueChange={(v) => setQuickCategory(v as typeof quickCategory)}
                  >
                    <SelectTrigger className="bg-background h-8 text-sm w-44">
                      <SelectValue placeholder="Leave unchanged" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Leave unchanged</SelectItem>
                      <SelectItem value="efootball">eFootball</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Price for all (₦)</label>
                  <Input
                    type="number"
                    min={MIN_PRICE}
                    placeholder="Leave unchanged"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    className="bg-background h-8 text-sm w-44"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyQuickFill}
                  disabled={!quickCategory && !quickPrice}
                  className="h-8 gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <Zap className="w-3.5 h-3.5" /> Apply to All
                </Button>
              </div>
            </div>

            {/* Item cards */}
            <div className="space-y-4 mb-8">
              {items.map((item, idx) => (
                <BulkItemCard
                  key={item.id}
                  index={idx}
                  item={item}
                  minPrice={MIN_PRICE}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onUploaded={markUploaded}
                  onUploadStart={markUploadStart}
                  onUploadError={markUploadError}
                />
              ))}
            </div>

            {/* Submit bar */}
            <div className="sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border border-border rounded-2xl shadow-lg px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {anyUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Uploading screenshots…
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-foreground">{items.length}</span> account{items.length !== 1 ? "s" : ""} ready to list
                  </span>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createBulkListings.isPending || anyUploading || items.length === 0}
                className="gap-2 min-w-[180px]"
              >
                {createBulkListings.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                ) : (
                  <><PackageCheck className="w-4 h-4" /> Publish All Listings</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
