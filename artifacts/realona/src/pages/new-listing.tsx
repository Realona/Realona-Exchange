import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateListing } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Upload, CheckCircle, Loader2, X, Gamepad2, Users, Plus, ArrowLeft, Star, Layers } from "lucide-react";
import { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";

export const EFOOTBALL_DIVISIONS = [
  "Division 1", "Division 2", "Division 3", "Division 4", "Division 5",
  "Division 6", "Division 7", "Division 8", "Division 9", "Division 10",
];

const SOCIAL_PLATFORMS = ["Instagram", "Twitter/X", "TikTok", "YouTube", "Facebook"];

// ─── eFootball schema ────────────────────────────────────────────────────────
const efootballSchema = z.object({
  price: z.coerce.number().positive("Price must be positive"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  pictureUrl: z.string().optional().or(z.literal("")),
  divisionRank: z.string().optional().or(z.literal("")),
  squadRating: z.coerce.number().int().min(1000).max(9999).optional().or(z.literal("")),
  konamiId: z.string().optional().or(z.literal("")),
  konamiPassword: z.string().optional().or(z.literal("")),
  accessCode: z.string().optional().or(z.literal("")),
});

// ─── Social media schema ─────────────────────────────────────────────────────
const socialSchema = z.object({
  price: z.coerce.number().positive("Price must be positive"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  pictureUrl: z.string().optional().or(z.literal("")),
  platform: z.string().min(1, "Select a platform"),
  accountHandle: z.string().optional().or(z.literal("")),
  followerCount: z.coerce.number().int().min(0).optional().or(z.literal("")),
  following: z.coerce.number().int().min(0).optional().or(z.literal("")),
  accountAge: z.string().optional().or(z.literal("")),
  engagementRate: z.string().optional().or(z.literal("")),
  accountEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  accountPassword: z.string().optional().or(z.literal("")),
});

type EfootballData = z.infer<typeof efootballSchema>;
type SocialData = z.infer<typeof socialSchema>;
type Category = "efootball" | "social_media";

// ─── Player entry ────────────────────────────────────────────────────────────
export interface PlayerEntry { name: string; rating: string; }

export function PlayerPicker({ players, onChange }: { players: PlayerEntry[]; onChange: (p: PlayerEntry[]) => void }) {
  const add = () => { if (players.length < 5) onChange([...players, { name: "", rating: "" }]); };
  const remove = (i: number) => onChange(players.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof PlayerEntry, value: string) => {
    const next = players.map((p, idx) => idx === i ? { ...p, [field]: value } : p);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Best Players <span className="text-muted-foreground text-xs font-normal">(optional – up to 5)</span></label>
          <p className="text-xs text-muted-foreground mt-0.5">Buyers search by player name. Include your top players and their ratings.</p>
        </div>
        {players.length < 5 && (
          <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Player
          </Button>
        )}
      </div>
      {players.length === 0 && (
        <button type="button" onClick={add}
          className="w-full border-2 border-dashed border-border rounded-lg py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add your best players
        </button>
      )}
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                placeholder={`Player ${i + 1} name (e.g. Mbappe)`}
                value={p.name}
                onChange={e => update(i, "name", e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                max="200"
                placeholder="Rating"
                value={p.rating}
                onChange={e => update(i, "rating", e.target.value)}
                className="bg-background text-center"
              />
            </div>
            <button type="button" onClick={() => remove(i)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {players.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {players.filter(p => p.name.trim()).map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
              <Star className="w-3 h-3 fill-primary" />
              {p.name.trim()}{p.rating ? ` (${p.rating})` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload widget ────────────────────────────────────────────────────────────
function ScreenshotUpload({ uploadedUrl, uploadedFileName, isUploading, uploadError, onClear, onUpload, fileInputRef }: {
  uploadedUrl: string; uploadedFileName: string; isUploading: boolean;
  uploadError: Error | null; onClear: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        Screenshot <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      {uploadedUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
            <img src={uploadedUrl} alt="Screenshot" className="w-full h-full object-cover" />
            <button type="button" onClick={onClear}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>{uploadedFileName || "Screenshot uploaded"}</span>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
          className="w-full rounded-lg border-2 border-dashed border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/50 aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isUploading ? (
            <><Loader2 className="w-8 h-8 opacity-60 animate-spin" /><p className="text-sm font-medium">Uploading...</p></>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10"><Upload className="w-6 h-6 text-primary" /></div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Click to upload screenshot</p>
                <p className="text-xs mt-0.5">PNG, JPG, WEBP up to 10MB</p>
              </div>
            </>
          )}
        </button>
      )}
      {uploadError && <p className="text-sm text-destructive mt-1">{uploadError.message}</p>}
    </div>
  );
}

// ─── eFootball form ───────────────────────────────────────────────────────────
function EfootballForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createListing = useCreateListing();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [players, setPlayers] = useState<PlayerEntry[]>([]);

  const { uploadFile, isUploading, error: uploadError } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const serveUrl = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      setUploadedUrl(serveUrl);
      form.setValue("pictureUrl", serveUrl);
      toast({ title: "Screenshot uploaded!" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const form = useForm<EfootballData>({
    resolver: zodResolver(efootballSchema),
    defaultValues: { price: 0, description: "", pictureUrl: "", divisionRank: "", squadRating: "", konamiId: "", konamiPassword: "", accessCode: "" },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image file.", variant: "destructive" }); return; }
    setUploadedFileName(file.name);
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: EfootballData) => {
    const highlightedPlayers = players
      .filter(p => p.name.trim())
      .map(p => p.rating ? `${p.name.trim()} (${p.rating})` : p.name.trim());

    createListing.mutate({
      data: {
        category: "efootball",
        gameName: "eFootball",
        price: data.price as number,
        description: data.description,
        pictureUrl: data.pictureUrl || undefined,
        divisionRank: data.divisionRank || undefined,
        squadRating: data.squadRating ? Number(data.squadRating) : undefined,
        konamiId: data.konamiId || undefined,
        konamiPassword: data.konamiPassword || undefined,
        accessCode: data.accessCode || undefined,
        highlightedPlayers: highlightedPlayers.length > 0 ? highlightedPlayers : undefined,
      },
    }, {
      onSuccess: (listing) => {
        toast({ title: "Listing created!", description: "Your account is now live on the marketplace." });
        queryClient.invalidateQueries({ queryKey: ["getListings"] });
        queryClient.invalidateQueries({ queryKey: ["getMyListings"] });
        setLocation(`/listings/${listing.id}`);
      },
      onError: (err: any) => toast({ title: "Failed to create listing", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Escrow notice */}
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700">
            Your credentials are <strong>100% safe</strong>. They're hidden until a buyer pays. Only after escrow confirmation do we reveal them.
          </p>
        </div>

        {/* Account details */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" /> Account Details
            </CardTitle>
            <CardDescription>Tell buyers about the eFootball account you're selling.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-primary">Game:</span>
              <span className="font-bold text-foreground">eFootball</span>
            </div>

            {/* Player picker */}
            <PlayerPicker players={players} onChange={setPlayers} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="divisionRank" render={({ field }) => (
                <FormItem>
                  <FormLabel>Division Rank</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value as string}>
                    <FormControl>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Select division" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EFOOTBALL_DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">Division 1 = highest rank</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="squadRating" render={({ field }) => (
                <FormItem>
                  <FormLabel>Squad Rating</FormLabel>
                  <FormControl>
                    <Input type="number" min="1000" max="9999" placeholder="e.g. 3500" className="bg-background"
                      {...field} value={field.value as string} />
                  </FormControl>
                  <FormDescription className="text-xs">Overall squad strength</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₦)</FormLabel>
                <FormControl>
                  <Input type="number" min="100" step="1" placeholder="e.g. 15000" {...field} className="bg-background" />
                </FormControl>
                <FormDescription>You'll receive the price minus the 4% platform fee.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe your eFootball account — GP coins, top players, division history, special achievements, etc."
                    className="bg-background min-h-[120px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <ScreenshotUpload
              uploadedUrl={uploadedUrl} uploadedFileName={uploadedFileName}
              isUploading={isUploading} uploadError={uploadError}
              onClear={() => { setUploadedUrl(""); setUploadedFileName(""); form.setValue("pictureUrl", ""); }}
              onUpload={handleFileChange} fileInputRef={fileInputRef}
            />
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Account Credentials</CardTitle>
            <CardDescription>Held securely — only revealed to the buyer after escrow payment is confirmed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="konamiId" render={({ field }) => (
              <FormItem>
                <FormLabel>Konami ID</FormLabel>
                <FormControl><Input placeholder="Your Konami ID or email" {...field} value={field.value as string} className="bg-background" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="konamiPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Konami Password</FormLabel>
                <FormControl><Input type="password" placeholder="Current password" {...field} value={field.value as string} className="bg-background" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Change Type
          </Button>
          <Button type="submit" className="flex-1 h-12 text-base" disabled={createListing.isPending || isUploading}>
            {createListing.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "List My eFootball Account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Social media form ────────────────────────────────────────────────────────
function SocialMediaForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createListing = useCreateListing();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const { uploadFile, isUploading, error: uploadError } = useUpload({
    basePath: "/api/storage",
    onSuccess: (response) => {
      const serveUrl = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      setUploadedUrl(serveUrl);
      form.setValue("pictureUrl", serveUrl);
      toast({ title: "Screenshot uploaded!" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const form = useForm<SocialData>({
    resolver: zodResolver(socialSchema),
    defaultValues: { price: 0, description: "", pictureUrl: "", platform: "", accountHandle: "", followerCount: "", following: "", accountAge: "", engagementRate: "", accountEmail: "", accountPassword: "" },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image file.", variant: "destructive" }); return; }
    setUploadedFileName(file.name);
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: SocialData) => {
    createListing.mutate({
      data: {
        category: "social_media",
        gameName: "Social Media Account",
        price: data.price as number,
        description: data.description,
        pictureUrl: data.pictureUrl || undefined,
        platform: data.platform,
        accountHandle: data.accountHandle || undefined,
        followerCount: data.followerCount ? Number(data.followerCount) : undefined,
        following: data.following ? Number(data.following) : undefined,
        accountAge: data.accountAge || undefined,
        engagementRate: data.engagementRate || undefined,
        accountEmail: data.accountEmail || undefined,
        accountPassword: data.accountPassword || undefined,
      },
    }, {
      onSuccess: (listing) => {
        toast({ title: "Listing created!", description: "Your account is now live on the marketplace." });
        queryClient.invalidateQueries({ queryKey: ["getListings"] });
        queryClient.invalidateQueries({ queryKey: ["getMyListings"] });
        setLocation(`/listings/${listing.id}`);
      },
      onError: (err: any) => toast({ title: "Failed to create listing", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700">
            Your credentials are <strong>100% safe</strong>. They're hidden until a buyer pays.
          </p>
        </div>

        {/* Account details */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Account Details
            </CardTitle>
            <CardDescription>Describe your social media account so buyers can find and evaluate it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Select platform" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="accountHandle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Handle</FormLabel>
                  <FormControl><Input placeholder="@username" className="bg-background" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="followerCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Followers</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="e.g. 10000" className="bg-background" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="following" render={({ field }) => (
                <FormItem>
                  <FormLabel>Following</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="e.g. 500" className="bg-background" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="accountAge" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Age</FormLabel>
                  <FormControl><Input placeholder="e.g. 3 years" className="bg-background" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="engagementRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement Rate</FormLabel>
                  <FormControl><Input placeholder="e.g. 3.5%" className="bg-background" {...field} value={field.value as string} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₦)</FormLabel>
                <FormControl><Input type="number" min="100" step="1" placeholder="e.g. 25000" {...field} className="bg-background" /></FormControl>
                <FormDescription>You'll receive the price minus the 4% platform fee.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe your account — niche, audience type, content history, monetization status, why you're selling, etc."
                    className="bg-background min-h-[120px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <ScreenshotUpload
              uploadedUrl={uploadedUrl} uploadedFileName={uploadedFileName}
              isUploading={isUploading} uploadError={uploadError}
              onClear={() => { setUploadedUrl(""); setUploadedFileName(""); form.setValue("pictureUrl", ""); }}
              onUpload={handleFileChange} fileInputRef={fileInputRef}
            />
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Account Credentials</CardTitle>
            <CardDescription>Held securely — only revealed to the buyer after escrow payment is confirmed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="accountEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Email</FormLabel>
                <FormControl><Input type="email" placeholder="email@example.com" {...field} value={field.value as string} className="bg-background" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="accountPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Password</FormLabel>
                <FormControl><Input type="password" placeholder="Current account password" {...field} value={field.value as string} className="bg-background" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Change Type
          </Button>
          <Button type="submit" className="flex-1 h-12 text-base" disabled={createListing.isPending || isUploading}>
            {createListing.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "List My Social Media Account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Category + mode chooser ──────────────────────────────────────────────────
type Mode = "single" | "bulk";

export default function NewListing() {
  const [category, setCategory] = useState<Category | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [, setLocation] = useLocation();

  // ── Step 3: show the actual single-listing form ──────────────────────────────
  if (category && mode === "single") {
    if (category === "efootball") {
      return (
        <Layout>
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="mb-6">
              <button
                onClick={() => setMode(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Sell eFootball Account</h1>
              </div>
              <p className="text-muted-foreground text-sm ml-12">List your account and get paid securely through escrow.</p>
            </div>
            <EfootballForm onBack={() => setMode(null)} />
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => setMode(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h1 className="text-2xl font-bold">Sell Social Media Account</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-12">List your account and get paid securely through escrow.</p>
          </div>
          <SocialMediaForm onBack={() => setMode(null)} />
        </div>
      </Layout>
    );
  }

  // ── Step 2: Single or Multiple listings? ─────────────────────────────────────
  if (category) {
    const isEfootball = category === "efootball";
    const Icon = isEfootball ? Gamepad2 : Users;
    const label = isEfootball ? "eFootball Account" : "Social Media Account";

    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <button
            onClick={() => setCategory(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${isEfootball ? "bg-primary/10" : "bg-purple-500/10"} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${isEfootball ? "text-primary" : "text-purple-600"}`} />
            </div>
            <h1 className="text-2xl font-bold">{label}</h1>
          </div>
          <p className="text-muted-foreground mb-10">How many accounts are you listing?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Single listing */}
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`group text-left p-6 rounded-2xl border-2 border-border bg-card ${isEfootball ? "hover:border-primary" : "hover:border-purple-500"} hover:shadow-lg transition-all duration-200`}
            >
              <div className={`w-12 h-12 rounded-xl ${isEfootball ? "bg-primary/10 group-hover:bg-primary/20" : "bg-purple-500/10 group-hover:bg-purple-500/20"} flex items-center justify-center mb-4 transition-colors`}>
                <Icon className={`w-6 h-6 ${isEfootball ? "text-primary" : "text-purple-600"}`} />
              </div>
              <h2 className="text-lg font-bold mb-1">Single Listing</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                List one account with full details — price, credentials, screenshots, and description.
              </p>
              <div className={`mt-5 text-sm font-semibold ${isEfootball ? "text-primary" : "text-purple-600"} group-hover:translate-x-1 transition-transform inline-flex items-center gap-1`}>
                Continue →
              </div>
            </button>

            {/* Bulk listing */}
            <button
              type="button"
              onClick={() => setLocation(`/listings/bulk?category=${category}`)}
              className="group text-left p-6 rounded-2xl border-2 border-border bg-card hover:border-amber-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center mb-4 transition-colors">
                <Layers className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                Multiple Listings
                <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">up to 10</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload screenshots for multiple accounts and list them all at once. Great for power sellers.
              </p>
              <div className="mt-5 text-sm font-semibold text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Continue →
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All listings are protected by our escrow system. Credentials are only revealed after payment is confirmed.
          </p>
        </div>
      </Layout>
    );
  }

  // ── Step 1: Category chooser ──────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Sell Your Account</h1>
          <p className="text-muted-foreground">Choose the type of account you want to list.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* eFootball card */}
          <button
            type="button"
            onClick={() => setCategory("efootball")}
            className="group text-left p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
              <Gamepad2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">eFootball Account</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Sell your eFootball mobile account — squad, top players, division rank, and Konami credentials.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Squad Rating", "Top Players", "Division Rank", "Konami ID"].map(tag => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            <div className="mt-5 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Select →
            </div>
          </button>

          {/* Social media card */}
          <button
            type="button"
            onClick={() => setCategory("social_media")}
            className="group text-left p-6 rounded-2xl border-2 border-border bg-card hover:border-purple-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center mb-4 transition-colors">
              <Users className="w-7 h-7 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold mb-1">Social Media Account</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Sell an Instagram, TikTok, YouTube, Twitter/X, or Facebook account with follower and engagement stats.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook"].map(tag => (
                <span key={tag} className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            <div className="mt-5 text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Select →
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          All listings are protected by our escrow system. Credentials are only revealed after payment is confirmed.
        </p>
      </div>
    </Layout>
  );
}
