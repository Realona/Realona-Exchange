import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet, Settings } from "lucide-react";
import { useGetWalletBalance } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const { data: walletData } = useGetWalletBalance({
    query: {
      queryKey: ["getWalletBalance"],
      enabled: !!token,
    }
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded">R</span>
            Realona
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard" className={`text-sm font-medium hover:text-primary transition-colors ${location.startsWith("/dashboard") ? "text-primary" : "text-muted-foreground"}`}>
                  Dashboard
                </Link>
                <Link href="/trades" className={`text-sm font-medium hover:text-primary transition-colors ${location.startsWith("/trades") ? "text-primary" : "text-muted-foreground"}`}>
                  Trades
                </Link>
                <div className="h-4 w-px bg-border mx-2"></div>
                <Link href="/wallet" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span>{walletData ? formatNaira(walletData.balance) : "..."}</span>
                </Link>
                
                <div className="flex items-center gap-2 ml-4">
                  {user.isAdmin || user.isSuperAdmin ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin
                      </Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
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

      <footer className="border-t border-border bg-card py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm flex flex-col gap-2">
          <p>© {new Date().getFullYear()} Realona Exchange. Secure Escrow Trading.</p>
          <p className="text-xs">Nigeria's premier eFootball account marketplace.</p>
        </div>
      </footer>
    </div>
  );
}
