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
import { ShieldCheck, ImageIcon } from "lucide-react";
import { useState } from "react";

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
  pictureUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  accountEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  accountPassword: z.string().optional().or(z.literal("")),
  divisionRank: z.string().optional().or(z.literal("")),
  squadRating: z.coerce.number().int().min(1).max(99).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function NewListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createListing = useCreateListing();
  const [picturePreview, setPicturePreview] = useState("");

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
            Account credentials you provide are <strong>only revealed to the buyer after payment is confirmed in escrow</strong>. You are protected.
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
                            min="1"
                            max="99"
                            placeholder="e.g. 85"
                            className="bg-background"
                            {...field}
                            value={field.value as string}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Overall squad strength (1–99)</FormDescription>
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
                      <FormDescription>You'll receive the price minus our 2.5% platform fee.</FormDescription>
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

                <FormField
                  control={form.control}
                  name="pictureUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Picture <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="Paste image URL (e.g. from Imgur, Cloudinary)"
                          className="bg-background"
                          {...field}
                          onChange={e => {
                            field.onChange(e);
                            setPicturePreview(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload your screenshot to <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Imgur</a> for free, then paste the link here.
                      </FormDescription>
                      {picturePreview ? (
                        <div className="mt-2 rounded-lg overflow-hidden border border-border bg-muted aspect-video relative">
                          <img
                            src={picturePreview}
                            alt="Account preview"
                            className="w-full h-full object-cover"
                            onError={() => setPicturePreview("")}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/40 aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <p className="text-xs">Picture preview will appear here</p>
                        </div>
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
                <CardDescription>Optional but recommended. These are held securely and only shown to the buyer after escrow payment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="accountEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="efootball@example.com" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Password</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Current password" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12 text-base" disabled={createListing.isPending}>
              {createListing.isPending ? "Creating listing..." : "List My eFootball Account"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
