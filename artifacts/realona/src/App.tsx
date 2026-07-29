import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Wallet from "@/pages/wallet";
import ListingDetail from "@/pages/listing-detail";
import NewListing from "@/pages/new-listing";
import MyListings from "@/pages/my-listings";
import Trades from "@/pages/trades";
import TradeDetail from "@/pages/trade-detail";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminTrades from "@/pages/admin/trades";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";
import HowItWorks from "@/pages/how-it-works";
import Offers from "@/pages/offers";
import Leaderboard from "@/pages/leaderboard";
import KYCPage from "@/pages/kyc";
import AdminDeposits from "@/pages/admin/deposits";
import AdminKycReview from "@/pages/admin/kyc-review";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminGiveaways from "@/pages/admin/giveaways";
import AdminReviews from "@/pages/admin/reviews";
import PublicWishlistPage from "@/pages/public-wishlist";
import FAQPage from "@/pages/faq";
import ActivityLogsPage from "@/pages/activity-logs";
import ReviewsPage from "@/pages/reviews";
import Wishlist from "@/pages/wishlist";
import Purchases from "@/pages/purchases";
import VerifyOtp from "@/pages/verify-otp";
import BulkListing from "@/pages/bulk-listing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!user.isAdmin && !user.isSuperAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-otp" component={VerifyOtp} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/wallet">
        <ProtectedRoute component={Wallet} />
      </Route>
      <Route path="/listings/new">
        <ProtectedRoute component={NewListing} />
      </Route>
      <Route path="/listings/my">
        <ProtectedRoute component={MyListings} />
      </Route>
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/trades">
        <ProtectedRoute component={Trades} />
      </Route>
      <Route path="/trades/:id">
        <ProtectedRoute component={TradeDetail} />
      </Route>
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/users">
        <AdminRoute component={AdminUsers} />
      </Route>
      <Route path="/admin/trades">
        <AdminRoute component={AdminTrades} />
      </Route>
      <Route path="/admin/withdrawals">
        <AdminRoute component={AdminWithdrawals} />
      </Route>
      <Route path="/admin/reports">
        <AdminRoute component={AdminReports} />
      </Route>
      <Route path="/admin/settings">
        <AdminRoute component={AdminSettings} />
      </Route>
      <Route path="/admin/deposits">
        <AdminRoute component={AdminDeposits} />
      </Route>
      <Route path="/admin/kyc-review">
        <AdminRoute component={AdminKycReview} />
      </Route>
      <Route path="/admin/announcements">
        <AdminRoute component={AdminAnnouncements} />
      </Route>
      <Route path="/admin/giveaways">
        <AdminRoute component={AdminGiveaways} />
      </Route>
      <Route path="/admin/reviews">
        <AdminRoute component={AdminReviews} />
      </Route>
      <Route path="/offers">
        <ProtectedRoute component={Offers} />
      </Route>
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/kyc">
        <ProtectedRoute component={KYCPage} />
      </Route>
      <Route path="/wishlist">
        <ProtectedRoute component={Wishlist} />
      </Route>
      <Route path="/purchases">
        <ProtectedRoute component={Purchases} />
      </Route>
      <Route path="/wishlist/:username" component={PublicWishlistPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/reviews" component={ReviewsPage} />
      <Route path="/activity">
        <ProtectedRoute component={ActivityLogsPage} />
      </Route>
      <Route path="/listings/bulk">
        <ProtectedRoute component={BulkListing} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
