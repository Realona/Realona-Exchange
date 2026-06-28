import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useCreateListing } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

const schema = z.object({
  gameName: z.string().min(2, "Game name required"),
  price: z.coerce.number().positive("Price must be positive"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  pictureUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  accountEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  accountPassword: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function NewListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createListing = useCreateListing();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gameName: "",
      price: 0,
      description: "",
      pictureUrl: "",
      accountEmail: "",
      accountPassword: "",
    },
  });

  const onSubmit = (data: FormData) => {
    createListing.mutate(
      {
        data: {
          gameName: data.gameName,
          price: data.price,
          description: data.description,
          pictureUrl: data.pictureUrl || undefined,
          accountEmail: data.accountEmail || undefined,
          accountPassword: data.accountPassword || undefined,
        },
      },
      {
        onSuccess: (listing) => {
          toast({ title: "Listing created!", description: "Your account is now live on the marketplace." });
          queryClient.invalidateQueries({ queryKey: ["getListings"] });
          queryClient.invalidateQueries({ queryKey: ["getListingsMy"] });
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
        <h1 className="text-3xl font-bold mb-2">Sell a Game Account</h1>
        <p className="text-muted-foreground mb-8">List your account and get paid securely through escrow.</p>

        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-600 dark:text-green-400">
            Account credentials you provide are <strong>only revealed to the buyer after payment is confirmed in escrow</strong>. You are protected.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Account Details</CardTitle>
                <CardDescription>Provide details about the game account you're selling.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gameName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PUBG Mobile, Free Fire, COD Mobile" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          placeholder="Describe your account in detail — level, skins, characters, achievements, etc."
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
                      <FormLabel>Screenshot URL (optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://..." {...field} className="bg-background" />
                      </FormControl>
                      <FormDescription>Link to a screenshot showing your account. Use Imgur, Cloudinary, etc.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

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
                        <Input type="email" placeholder="gameemail@example.com" {...field} className="bg-background" />
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
              {createListing.isPending ? "Creating listing..." : "Create Listing"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
