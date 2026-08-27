import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Wallet, Settings, Bell, HandshakeIcon, Trophy, X, ShieldCheck, MessageCircle } from "lucide-react";
import { useGetWalletBalance, useGetNotifications, useMarkAllNotificationsRead, useGetMyOffers } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [bellOpen, setBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(
    () => localStorage.getItem("mobileBannerDismissed") === "1"
  );
  // Detect narrow / touch viewport — typical mobile browser
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const showMobileBanner = isMobile && !mobileBannerDismissed;

  const dismissMobileBanner = () => {
    localStorage.setItem("mobileBannerDismissed", "1");
    setMobileBannerDismissed(true);
  };

  const { data: walletData } = useGetWalletBalance({
    query: { queryKey: ["getWalletBalance"], enabled: !!token }
  });

  const { data: notifications } = useGetNotifications({
    query: {
      queryKey: ["getNotifications"],
      enabled: !!token,
      refetchInterval: 30000,
    }
  });

  const markRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;
  const recentNotes = notifications?.slice(0, 10) ?? [];

  const { data: offers } = useGetMyOffers({
    query: { queryKey: ["getMyOffers"], enabled: !!token, refetchInterval: 30000 }
  });
  // Count offers where it's YOUR turn to act: received pending/countered, or made offers where seller countered
  const pendingOffersCount = offers?.filter((o: any) =>
    (o.sellerId === user?.id && (o.status === "pending" || o.status === "countered")) ||
    (o.buyerId === user?.id && o.status === "countered")
  ).length ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellOpen = () => setBellOpen(v => !v);

  const handleMarkRead = () => {
    markRead.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getNotifications"] }),
    });
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  const navLink = (path: string) =>
    `text-xs font-medium transition-colors ${location.startsWith(path) ? "text-white" : "text-white/70 hover:text-white"}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Mobile desktop-mode banner ── */}
      {showMobileBanner && (
        <div className="sticky top-0 z-[60] flex items-center gap-3 px-4 py-2.5 text-white text-xs font-medium" style={{ background: "hsl(38,92%,42%)" }}>
          <span className="text-base shrink-0">📱</span>
          <span className="flex-1 leading-snug">
            For the best experience, enable <strong>Desktop Mode</strong> in your browser menu before using Realona Exchange.
          </span>
          <button
            onClick={dismissMobileBanner}
            className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* ── Blue header ── */}
      <header className="sticky top-0 z-50 shadow-md overflow-hidden" style={{ background: "hsl(221,70%,48%)" }}>
        <div className="container mx-auto px-2 sm:px-4 h-16 flex items-center gap-2 overflow-hidden">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="bg-white/20 text-white px-2 py-1 rounded font-black text-sm tracking-wide">RE</span>
            <span className="text-white font-bold text-base hidden sm:inline">
              Realona <span style={{ color: "hsl(38,92%,65%)" }}>Exchange</span>
            </span>
          </Link>

          <nav className="min-w-0 flex-1 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {user ? (
              <>
                <Link href="/dashboard">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/dashboard")}`}>Dashboard</button>
                </Link>
                <Link href="/trades">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/trades")}`}>Trades</button>
                </Link>
                <Link href="/offers">
                  <button className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 relative ${navLink("/offers")}`}>
                    <HandshakeIcon className="w-3.5 h-3.5" /> Offers
                    {pendingOffersCount > 0 && (
                      <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 leading-none">
                        {pendingOffersCount > 9 ? "9+" : pendingOffersCount}
                      </span>
                    )}
                  </button>
                </Link>
                <Link href="/leaderboard">
                  <button className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 ${navLink("/leaderboard")}`}>
                    <Trophy className="w-3.5 h-3.5" /> Leaderboard
                  </button>
                </Link>
                <Link href="/reviews">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/reviews")}`}>Reviews</button>
                </Link>

                <div className="h-4 w-px bg-white/20 mx-1" />

                {/* Wallet balance — gold */}
                <Link href="/wallet">
                  <button className="px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white transition-colors">
                    <Wallet className="w-3.5 h-3.5" style={{ color: "hsl(38,92%,65%)" }} />
                    <span style={{ color: "hsl(38,92%,65%)" }}>{walletData ? formatNaira(walletData.balance) : "—"}</span>
                  </button>
                </Link>

                {/* Notification bell */}
                <div className="relative" ref={bellRef}>
                  <button
                    className="relative w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={handleBellOpen}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {bellOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="font-semibold text-sm text-foreground">Notifications</span>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary px-2" onClick={handleMarkRead}>
                              Mark all read
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setBellOpen(false)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-border">
                        {recentNotes.length === 0 ? (
                          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No notifications yet
                          </div>
                        ) : (
                          recentNotes.map((n: any) => (
                            <div key={n.id} className={`px-4 py-3 text-sm ${!n.isRead ? "bg-primary/5" : ""}`}>
                              <div className="flex items-start gap-2">
                                {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs text-foreground">{n.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                                    {new Date(n.createdAt).toLocaleDateString("en-NG", { dateStyle: "short" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin + Logout */}
                <div className="flex items-center gap-1 ml-1">
                  {(user.isAdmin || user.isSuperAdmin) && (
                    <Link href="/admin">
                      <button className="h-7 px-2.5 rounded-md border border-white/30 text-white text-xs flex items-center gap-1 hover:bg-white/10 transition-colors">
                        <Settings className="w-3.5 h-3.5" /> Admin
                      </button>
                    </Link>
                  )}
                  <button
                    className="h-7 px-2.5 rounded-md text-white/70 text-xs flex items-center gap-1 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/leaderboard">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/leaderboard")}`}>Leaderboard</button>
                </Link>
                <Link href="/reviews">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/reviews")}`}>Reviews</button>
                </Link>
                <Link href="/faq">
                  <button className={`px-2.5 py-1.5 rounded-md ${navLink("/faq")}`}>FAQ</button>
                </Link>
                <Link href="/login">
                  <button className="h-8 px-3 rounded-md border border-white/40 text-white text-xs font-medium hover:bg-white/10 transition-colors">
                    Login
                  </button>
                </Link>
                <Link href="/register">
                  <button
                    className="h-8 px-3 rounded-md text-xs font-semibold transition-colors ml-1"
                    style={{ background: "hsl(38,92%,50%)", color: "hsl(38,100%,15%)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "hsl(38,92%,45%)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "hsl(38,92%,50%)")}
                  >
                    Register
                  </button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Floating Chat Admin */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-sm font-semibold transition-colors"
        style={{ background: "hsl(38,92%,50%)", color: "hsl(38,100%,15%)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "hsl(38,92%,44%)")}
        onMouseLeave={e => (e.currentTarget.style.background = "hsl(38,92%,50%)")}
        aria-label="Chat with Admin"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Chat Admin</span>
      </button>

      {/* Chat Admin Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Contact Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Need help with a trade, deposit, or have a question? Reach our admin directly.
            </p>
            <div className="space-y-3">
              <a
                href="https://wa.me/2349160385331"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors"
              >
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-sm text-green-700">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">+234 916 038 5331</p>
                </div>
              </a>
              <div className="text-xs text-muted-foreground text-center">
                Available 8am – 10pm (WAT) daily
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                <span>Admin will <strong>never</strong> ask you to send money outside Realona Exchange.</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm flex flex-col gap-2">
          <div className="flex items-center justify-center gap-4 mb-3 flex-wrap">
            <Link href="/how-it-works" className="text-xs text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
            <span className="text-xs text-border">·</span>
            <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-primary transition-colors">Leaderboard</Link>
            <span className="text-xs text-border">·</span>
            <Link href="/reviews" className="text-xs text-muted-foreground hover:text-primary transition-colors">Reviews</Link>
            <span className="text-xs text-border">·</span>
            <Link href="/faq" className="text-xs text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
            <span className="text-xs text-border">·</span>
            <Link href="/kyc" className="text-xs text-muted-foreground hover:text-primary transition-colors">KYC Verification</Link>
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-bold text-foreground text-sm">Realona</span>
            <span className="font-bold text-sm" style={{ color: "hsl(38,92%,44%)" }}>Exchange</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Realona Exchange. Secure Escrow Trading Platform.</p>
          <p className="text-xs text-muted-foreground">Nigeria's premier eFootball & social media account marketplace.</p>

          {/* Moniepoint trust badge */}
          <div className="flex items-center justify-center mt-3">
            <div className="inline-flex items-center gap-2 bg-[#f0faf4] border border-[#00a551]/20 rounded-full px-4 py-1.5">
              <span className="text-xs text-[#006633] font-medium">Payments verified by</span>
              <span className="font-extrabold text-sm tracking-tight" style={{ color: "#00a551" }}>Moniepoint</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#00a551" opacity="0.15"/>
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="#00a551" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="#00a551" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
