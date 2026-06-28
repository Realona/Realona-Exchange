import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetMyListings, useUpdateListing } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Link } from "wouter";
import { Plus, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function MyListings() {
  const { data: listings, isLoading } = useGetMyListings();
  const updateListing = useUpdateListing();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      sold: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      deleted: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
  }

  const handleDelete = (id: number) => {
    updateListing.mutate(
      { id, data: { status: "deleted" } },
      {
        onSuccess: () => {
          toast({ title: "Listing removed" });
          queryClient.invalidateQueries({ queryKey: ["getListingsMy"] });
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">My Listings</h1>
            <p className="text-muted-foreground">Manage the game accounts you're selling.</p>
          </div>
          <Button asChild>
            <Link href="/listings/new">
              <Plus className="w-4 h-4 mr-2" />
              New Listing
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">Create your first listing to start selling.</p>
            <Button asChild><Link href="/listings/new">Create Listing</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <Card key={listing.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center gap-4">
                  {listing.pictureUrl && (
                    <img src={listing.pictureUrl} alt={listing.gameName} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">{listing.gameName}</Badge>
                      {statusBadge(listing.status)}
                    </div>
                    <p className="font-semibold truncate">{listing.description}</p>
                    <p className="text-primary font-bold">{formatNaira(listing.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/listings/${listing.id}`}>View</Link>
                    </Button>
                    {listing.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => handleDelete(listing.id)}
                        disabled={updateListing.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
