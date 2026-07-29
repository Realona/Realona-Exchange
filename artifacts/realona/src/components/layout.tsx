import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Wallet, Settings, Bell, HandshakeIcon, Trophy, X, ShieldCheck, MessageCircle, Phone } from "lucide-react";
import { useGetWalletBalance, useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
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

  // Close bell when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellOpen = () => {
    setBellOpen(v => !v);
  };

  const handleMarkRead = () => {
    markRead.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getNotifications"] }),
    });
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded font-black">R</span>
            Realona
          </Link>

          <nav className="flex items-center gap-1">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className={`text-xs ${location.startsWith("/dashboard") ? "text-primary" : "text-muted-foreground"}`}>
                    Dashboard
                  </Button>
                </Link>
                <Link href="/trades">
                  <Button variant="ghost" size="sm" className={`text-xs ${location.startsWith("/trades") ? "text-primary" : "text-muted-foreground"}`}>
                    Trades
                  </Button>
                </Link>
                <Link href="/offers">
                  <Button variant="ghost" size="sm" className={`text-xs flex items-center gap-1 ${location.startsWith("/offers") ? "text-primary" : "text-muted-foreground"}`}>
                    <HandshakeIcon className="w-3.5 h-3.5" />
                    Offers
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button variant="ghost" size="sm" className={`text-xs flex items-center gap-1 ${location.startsWith("/leaderboard") ? "text-primary" : "text-muted-foreground"}`}>
                    <Trophy className="w-3.5 h-3.5" />
                    Leaderboard
                  </Button>
                </Link>

                <div className="h-4 w-px bg-border mx-1" />

                <Link href="/wallet">
                  <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-primary">{walletData ? formatNaira(walletData.balance) : "—"}</span>
                  </Button>
                </Link>

                {/* Notification Bell */}
                <div className="relative" ref={bellRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 relative"
                    onClick={handleBellOpen}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>

                  {bellOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="font-semibold text-sm">Notifications</span>
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
                            <div
                              key={n.id}
                              className={`px-4 py-3 text-sm ${!n.isRead ? "bg-primary/5" : ""}`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs">{n.title}</p>
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

                <div className="flex items-center gap-1 ml-1">
                  {user.isAdmin || user.isSuperAdmin ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <Link href="/admin">
                        <Settings className="w-3.5 h-3.5 mr-1" />
                        Admin
                      </Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleLogout}>
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/leaderboard">
                  <Button variant="ghost" size="sm" className="text-xs">Leaderboard</Button>
                </Link>
                <Link href="/faq">
                  <Button variant="ghost" size="sm" className="text-xs">FAQ</Button>
                </Link>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild className="text-xs">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Floating Chat Admin button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
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
                  <p className="font-semibold text-sm text-green-600 dark:text-green-400">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">+234 916 038 5331</p>
                </div>
              </a>
              <div className="text-xs text-muted-foreground text-center">
                Available 8am – 10pm (WAT) daily
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                <span>Admin will <strong>never</strong> ask you to send money outside Realona.</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border bg-card py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm flex flex-col gap-2">
          <div className="flex items-center justify-center gap-6 mb-2 flex-wrap">
            <a href="/how-it-works" className="hover:text-primary transition-colors text-xs">How It Works</a>
            <span className="text-xs opacity-40">·</span>
            <a href="/leaderboard" className="hover:text-primary transition-colors text-xs">Leaderboard</a>
            <span className="text-xs opacity-40">·</span>
            <a href="/reviews" className="hover:text-primary transition-colors text-xs">Reviews</a>
            <span className="text-xs opacity-40">·</span>
            <a href="/faq" className="hover:text-primary transition-colors text-xs">FAQ</a>
            <span className="text-xs opacity-40">·</span>
            <a href="/kyc" className="hover:text-primary transition-colors text-xs">KYC Verification</a>
          </div>
          <p>© {new Date().getFullYear()} Realona Exchange. Secure Escrow Trading.</p>
          <p className="text-xs">Nigeria's premier eFootball & social media account marketplace.</p>
        </div>
      </footer>
    </div>
  );
}
