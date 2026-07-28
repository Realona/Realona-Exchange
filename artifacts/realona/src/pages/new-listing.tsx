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
import { ShieldCheck, ImageIcon, Upload, CheckCircle, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useUpload } from "@workspace/object-storage-web";

export const EFOOTBALL_DIVISIONS = [
  "Division 1",
  "Division 2",
  "Division 3",
  "Division 4",
  "Division 5",
  "Division 6",
  "Division 7",
  "Division 8",
  "Division 9",
  "Division 10",
];

const schema = z.object({
  gameName: z.string().default("eFootball"),
  price: z.coerce.number().positive("Price must be positive"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  pictureUrl: z.string().optional().or(z.literal("")),
  accountEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  accountPassword: z.string().optional().or(z.literal("")),
  divisionRank: z.string().optional().or(z.literal("")),
  squadRating: z.coerce.number().int().min(2000).max(5000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function NewListing() {
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
      // Build the URL to serve the uploaded file
      const serveUrl = `/api/storage/objects${response.objectPath.replace(/^\/objects/, "")}`;
      setUploadedUrl(serveUrl);
      form.setValue("pictureUrl", serveUrl);
      toast({ title: "Screenshot uploaded!", description: "Your screenshot is ready." });
    },
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gameName: "eFootball",
      price: 0,
      description: "",
      pictureUrl: "",
      accountEmail: "",
      accountPassword: "",
      divisionRank: "",
      squadRating: "",
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Accept only image files
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setUploadedFileName(file.name);
    await uploadFile(file);
    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearUpload = () => {
    setUploadedUrl("");
    setUploadedFileName("");
    form.setValue("pictureUrl", "");
  };

  const onSubmit = (data: FormData) => {
    createListing.mutate(
      {
        data: {
          gameName: data.gameName,
          price: data.price as number,
          description: data.description,
          pictureUrl: data.pictureUrl || undefined,
          accountEmail: data.accountEmail || undefined,
          accountPassword: data.accountPassword || undefined,
          divisionRank: data.divisionRank || undefined,
          squadRating: data.squadRating ? Number(data.squadRating) : undefined,
        },
      },
      {
        onSuccess: (listing) => {
          toast({ title: "Listing created!", description: "Your eFootball account is now live on the marketplace." });
          queryClient.invalidateQueries({ queryKey: ["getListings"] });
          queryClient.invalidateQueries({ queryKey: ["getMyListings"] });
          setLocation(`/listings/${listing.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to create listing", description: err?.data?.error ?? err?.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Sell Your eFootball Account</h1>
        <p className="text-muted-foreground mb-8">List your eFootball account and get paid securely through escrow.</p>

        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-600 dark:text-green-400">
            Your Konami ID and password are <strong>100% safe on our platform</strong>. They are encrypted and hidden from everyone until a buyer pays. Only after we confirm the buyer's payment do we share your credentials — and you remain in control until the buyer confirms access. We have 24/7 admin support.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Account Details */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Account Details</CardTitle>
                <CardDescription>Provide details about the eFootball account you're selling.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Game locked */}
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                  <span className="text-sm font-medium text-primary">Game:</span>
                  <span className="font-bold text-foreground">eFootball</span>
                </div>

                {/* Division & Squad Rating side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="divisionRank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division Rank</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EFOOTBALL_DIVISIONS.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">Division 1 = highest</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="squadRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Squad Rating</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2000"
                            max="5000"
                            placeholder="e.g. 3500"
                            className="bg-background"
                            {...field}
                            value={field.value as string}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Overall squad strength (2000–5000)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" min="100" step="1" placeholder="e.g. 15000" {...field} className="bg-background" />
                      </FormControl>
                      <FormDescription>You'll receive the price minus our 4% platform fee.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your eFootball account — GP coins, top players, squad rating, division history, special achievements, etc."
                          className="bg-background min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Screenshot Upload */}
                <FormField
                  control={form.control}
                  name="pictureUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Account Screenshot <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {uploadedUrl ? (
                        /* Uploaded state */
                        <div className="space-y-2">
                          <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                            <img
                              src={uploadedUrl}
                              alt="Account screenshot"
                              className="w-full h-full object-cover"
                              onError={() => {
                                // If image fails to load, show placeholder
                              }}
                            />
                            <button
                              type="button"
                              onClick={clearUpload}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                              aria-label="Remove screenshot"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>{uploadedFileName || "Screenshot uploaded"}</span>
                          </div>
                        </div>
                      ) : (
                        /* Upload prompt */
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full rounded-lg border-2 border-dashed border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/50 aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-8 h-8 opacity-60 animate-spin" />
                              <p className="text-sm font-medium">Uploading screenshot...</p>
                            </>
                          ) : (
                            <>
                              <div className="p-3 rounded-full bg-primary/10">
                                <Upload className="w-6 h-6 text-primary" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-foreground">Click to upload screenshot</p>
                                <p className="text-xs mt-0.5">PNG, JPG, WEBP up to 10MB</p>
                              </div>
                            </>
                          )}
                        </button>
                      )}

                      {uploadError && (
                        <p className="text-sm text-destructive">{uploadError.message}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Account Credentials */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Account Credentials</CardTitle>
                <CardDescription>Optional but recommended. These are held securely and only shown to the buyer after escrow payment is confirmed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="accountEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konami ID (Email / Username)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="konami@example.com" {...field} className="bg-background" />
                      </FormControl>
                      <FormDescription className="text-xs">The email or username used to log in to eFootball</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konami Password</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Current account password" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12 text-base" disabled={createListing.isPending || isUploading}>
              {createListing.isPending ? "Creating listing..." : "List My eFootball Account"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
