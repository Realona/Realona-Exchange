import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Search, ShieldCheck, Zap, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  
  const { data: listings, isLoading } = useGetListings({
    query: {
      queryKey: ["listings", search],
    }
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-card border-b border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50 pointer-events-none"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Secure Escrow Platform</Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Trade Game Accounts <br/> <span className="text-primary">Without Risk.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              Realona is Nigeria's most trusted marketplace for buying and selling premium game accounts. Our strict escrow system guarantees that sellers get paid and buyers get what they paid for.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="text-base h-12 px-8">
                <Link href={user ? "/listings/new" : "/login"}>Sell Account</Link>
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for games (e.g. Valorant, Genshin)..." 
                  className="h-12 pl-10 bg-background border-border text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">100% Secure Escrow</h3>
                <p className="text-sm text-muted-foreground">Funds are held safely until the buyer confirms full access to the account.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Instant Payouts</h3>
                <p className="text-sm text-muted-foreground">Withdraw your earnings directly to any Nigerian bank account instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Live Chat Support</h3>
                <p className="text-sm text-muted-foreground">Communicate directly with buyers or sellers securely through our platform.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Active Listings</h2>
              <p className="text-muted-foreground">Browse premium accounts available right now.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 bg-card border border-border rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors group flex flex-col">
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {listing.pictureUrl ? (
                      <img 
                        src={listing.pictureUrl} 
                        alt={listing.gameName} 
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-primary font-bold px-3 py-1 rounded shadow-sm border border-border">
                      {formatNaira(listing.price)}
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-secondary text-xs rounded-sm">
                        {listing.gameName}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2" title={listing.description}>
                      {listing.description}
                    </h3>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {listing.sellerUsername?.[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">{listing.sellerUsername}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex gap-2">
                    <Button className="flex-1" asChild>
                      <Link href={`/listings/${listing.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
              <h3 className="text-xl font-semibold mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-6">Be the first to list an account!</p>
              <Button asChild>
                <Link href="/listings/new">Sell an Account</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
