import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDeleteListing, useGetMyListings, useUpdateListing } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Link } from "wouter";
import { Pencil, Plus, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGetMyListingsQueryKey } from "@workspace/api-client-react";

export default function MyListings() {
  const { data: listings, isLoading } = useGetMyListings();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingListing, setEditingListing] = useState<{ id: number; name: string; price: string } | null>(null);

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      sold: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      deleted: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
  }

  const handleDelete = (id: number) => {
    deleteListing.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Listing removed" });
          queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" });
        },
      }
    );
  };

  const handlePriceSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingListing) return;

    const nextPrice = Number(editingListing.price);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      toast({
        title: "Enter a valid price",
        description: "The price must be greater than ₦0.",
        variant: "destructive",
      });
      return;
    }

    updateListing.mutate(
      { id: editingListing.id, data: { price: nextPrice } },
      {
        onSuccess: () => {
          toast({ title: "Listing price updated" });
          setEditingListing(null);
          queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
        },
        onError: (err: any) => {
          toast({
            title: "Couldn't update price",
            description: err?.data?.error ?? err?.message,
            variant: "destructive",
          });
        },
      },
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
                    {(listing.status === "active" || listing.status === "paused") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingListing({
                          id: listing.id,
                          name: listing.gameName,
                          price: String(listing.price),
                        })}
                        disabled={deleteListing.isPending}
                        data-testid={`button-edit-price-${listing.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-1.5" />
                        Change price
                      </Button>
                    )}
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

      <Dialog open={!!editingListing} onOpenChange={(open) => !open && setEditingListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change listing price</DialogTitle>
            <DialogDescription>
              Increase or reduce the price for “{editingListing?.name}”. Buyers will see the new price immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePriceSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="listing-price">New price (₦)</Label>
              <Input
                id="listing-price"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={editingListing?.price ?? ""}
                onChange={(event) =>
                  setEditingListing((current) => current ? { ...current, price: event.target.value } : current)
                }
                autoFocus
                required
                data-testid="input-listing-price"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingListing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateListing.isPending} data-testid="button-save-listing-price">
                {updateListing.isPending ? "Saving..." : "Save price"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
