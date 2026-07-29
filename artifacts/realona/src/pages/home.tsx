import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { Search, ShieldCheck, Zap, MessageSquare, SlidersHorizontal, X, Users } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EFOOTBALL_DIVISIONS } from "./new-listing";

export default function Home() {
  const [search, setSearch] = useState("");
  const [divisionRank, setDivisionRank] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<"all" | "efootball" | "social_media">("all");
  const { user } = useAuth();

  const hasFilters = divisionRank || minRating || maxRating;

  const { data: allListings, isLoading } = useGetListings({
    search: search || undefined,
    divisionRank: divisionRank || undefined,
    minSquadRating: minRating ? Number(minRating) : undefined,
    maxSquadRating: maxRating ? Number(maxRating) : undefined,
  });

  const listings = category === "all"
    ? allListings
    : allListings?.filter((l: any) => (l.category ?? "efootball") === category);

  const clearFilters = () => {
    setDivisionRank("");
    setMinRating("");
    setMaxRating("");
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-card border-b border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50 pointer-events-none"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Secure Escrow Platform</Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Trade eFootball Accounts <br/> <span className="text-primary">Without Risk.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              Realona is Nigeria's most trusted marketplace for buying and selling premium eFootball accounts. Our strict escrow system guarantees that sellers get paid and buyers get what they paid for.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="text-base h-12 px-8">
                <Link href={user ? "/listings/new" : "/login"}>Sell eFootball Account</Link>
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search eFootball accounts..."
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
              <div className="bg-primary/10 p-3 rounded-lg text-primary"><ShieldCheck className="w-6 h-6" /></div>
              <div>
                <h3 className="font-semibold mb-1">100% Secure Escrow</h3>
                <p className="text-sm text-muted-foreground">Funds are held safely until the buyer confirms full access to the eFootball account.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary"><Zap className="w-6 h-6" /></div>
              <div>
                <h3 className="font-semibold mb-1">Instant Payouts</h3>
                <p className="text-sm text-muted-foreground">Withdraw your earnings directly to any Nigerian bank account instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary"><MessageSquare className="w-6 h-6" /></div>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Accounts For Sale</h2>
              <p className="text-muted-foreground">Browse premium eFootball and social media accounts.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(v => !v)}
              className={showFilters ? "border-primary text-primary" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {hasFilters && <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">!</span>}
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-6">
            {(["all", "efootball", "social_media"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All" : cat === "efootball" ? "eFootball" : "Social Media"}
              </button>
            ))}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Division Rank</label>
                  <Select value={divisionRank} onValueChange={setDivisionRank}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Any division" />
                    </SelectTrigger>
                    <SelectContent>
                      {EFOOTBALL_DIVISIONS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Squad Rating</label>
                  <Input
                    type="number" min="1" max="99" placeholder="e.g. 80"
                    value={minRating} onChange={e => setMinRating(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Squad Rating</label>
                  <Input
                    type="number" min="1" max="99" placeholder="e.g. 99"
                    value={maxRating} onChange={e => setMaxRating(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          )}

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
                        alt="eFootball account"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary text-sm">
                        No Screenshot
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-primary font-bold px-3 py-1 rounded shadow-sm border border-border text-sm">
                      {formatNaira(listing.price)}
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1">
                    {/* Division & Rating badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(listing as any).category === "social_media" ? (
                        <>
                          {(listing as any).platform && (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs capitalize">{(listing as any).platform}</Badge>
                          )}
                          {(listing as any).followerCount != null && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                              {Number((listing as any).followerCount).toLocaleString()} followers
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {listing.divisionRank && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{listing.divisionRank}</Badge>
                          )}
                          {listing.squadRating != null && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                              {listing.squadRating} OVR
                            </Badge>
                          )}
                          {!listing.divisionRank && listing.squadRating == null && (
                            <Badge variant="outline" className="bg-secondary text-xs rounded-sm">eFootball</Badge>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 mb-2">{listing.description}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {listing.sellerUsername?.[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">{listing.sellerUsername}</span>
                      {(listing as any).sellerIsVerified && (
                        <span title="Verified" className="text-primary"><ShieldCheck className="w-3.5 h-3.5" /></span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button className="w-full" asChild>
                      <Link href={`/listings/${listing.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
              <h3 className="text-xl font-semibold mb-2">{hasFilters ? "No listings match your filters" : "No listings yet"}</h3>
              <p className="text-muted-foreground mb-6">
                {hasFilters ? "Try adjusting your filters." : "Be the first to list your eFootball account!"}
              </p>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              ) : (
                <Button asChild>
                  <Link href="/listings/new">Sell My eFootball Account</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
