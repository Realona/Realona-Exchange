import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRightLeft,
  BadgeCheck,
  Bell,
  CircleDollarSign,
  Heart,
  HelpCircle,
  KeyRound,
  ListChecks,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";

type GuideSectionProps = {
  id: string;
  title: string;
  intro: string;
  icon: React.ElementType;
  steps: string[];
};

function GuideSection({ id, title, intro, icon: Icon, steps }: GuideSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="border-border bg-card">
        <CardContent className="p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{intro}</p>
            </div>
          </div>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

const quickLinks = [
  ["Account & ID", "#account"],
  ["Wallet", "#wallet"],
  ["Browse & Save", "#browse"],
  ["Buy", "#buy"],
  ["Sell", "#sell"],
  ["Trade & OTP", "#trade"],
  ["Safety & Support", "#safety"],
];

export default function HowItWorks() {
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-12">
        <header className="mb-8 text-center">
          <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary">Complete Platform Guide</Badge>
          <h1 className="text-3xl font-extrabold sm:text-4xl">How Realona Exchange Works</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Learn how to register, verify your ID, fund your wallet, buy or sell accounts, complete escrow transfers, and use every important website feature safely.
          </p>
        </header>

        <nav className="mb-8 flex flex-wrap justify-center gap-2" aria-label="Guide sections">
          {quickLinks.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary">
              {label}
            </a>
          ))}
        </nav>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <BadgeCheck className="h-5 w-5 fill-emerald-700 text-white" /> Deep-green Verified Trader tick
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Awarded by Realona for trusted trading activity.</p>
          </div>
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-blue-800">
              <BadgeCheck className="h-5 w-5 fill-blue-700 text-white" /> Blue ID Verified tick
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Confirms approved government ID. Eligible users can show both ticks.</p>
          </div>
        </div>

        <div className="space-y-6">
          <GuideSection
            id="account"
            title="Create Your Account & Verify Your Identity"
            intro="Start with a secure account, then add the blue ID Verified tick to build trust."
            icon={UserCheck}
            steps={[
              "Open Register, enter your email, username, and password, then submit the one-time code sent to your email.",
              "Sign in and use the dashboard as the central place for your wallet, listings, trades, offers, wishlist, purchases, analytics, and verification.",
              "Open KYC Verification, choose your ID type, upload a clear government ID, and optionally add a selfie for Level 2.",
              "Wait for admin review. Approval adds the blue ID Verified tick; trusted trading activity may separately earn the deep-green Verified Trader tick.",
            ]}
          />

          <GuideSection
            id="wallet"
            title="Fund & Manage Your Wallet"
            intro="Buyers need enough available wallet balance before starting a trade."
            icon={Wallet}
            steps={[
              "Open Wallet and choose Deposit.",
              "Enter your amount and follow the current payment instructions shown on the wallet page. Submit proof when requested.",
              "Wait for confirmation, then check that your available balance has updated before buying.",
              "To cash out, choose Withdraw, enter your Nigerian bank details and amount, and monitor the request status. Funds reserved in active trades cannot be withdrawn.",
            ]}
          />

          <GuideSection
            id="browse"
            title="Browse, Search, Save & Make Offers"
            intro="Compare accounts carefully before committing your wallet funds."
            icon={Search}
            steps={[
              "Browse active eFootball and social-media listings, then use search and filters to narrow the results.",
              "Open View Details to inspect the description, screenshots, price, seller rating, and green or blue verification ticks.",
              "Tap the heart to save a listing. Open My Wishlist later to review saved accounts or share your public wishlist link.",
              "Where available, choose Make an Offer and enter your proposed price. Track accepted, rejected, or countered offers from My Offers.",
            ]}
          />

          <GuideSection
            id="buy"
            title="Buy an Account Through Escrow"
            intro="Realona reserves the listing and holds the exact current price through the protected checkout flow."
            icon={ShoppingBag}
            steps={[
              "Confirm your wallet has enough available balance and open the listing you want.",
              "Select Buy Now. A successful purchase reserves the listing, deducts the wallet once, and creates the trade at the current listing price.",
              "Open the trade page and communicate only through its private chat. Do not send extra money or move the deal outside Realona.",
              "Follow the account-transfer stages. Confirm receipt only after the account matches the listing, you can access it, and ownership has been secured.",
            ]}
          />

          <GuideSection
            id="sell"
            title="List, Manage & Sell Accounts"
            intro="Accurate listings reduce disputes and help buyers decide confidently."
            icon={ListChecks}
            steps={[
              "Choose New Listing, select the category, enter accurate account details and price, and upload a clear screenshot from your own account.",
              "Never put login credentials in the public description. Stored credentials remain restricted to the protected trade flow.",
              "Use My Listings to view, change the price of, pause, reactivate, or remove an active or paused listing. Reserved, sold, and removed listings are protected from unsafe changes.",
              "If bulk listing is enabled, use the bulk page to prepare several listings and review each item before submitting.",
              "After a funded buyer starts a trade, transfer the account only through the trade steps. Your payout is credited when the trade completes, minus the displayed fee.",
            ]}
          />

          <GuideSection
            id="trade"
            title="Complete Trades, Chat & OTP Transfer"
            intro="The trade page records the evidence and guides both parties through each stage."
            icon={KeyRound}
            steps={[
              "Use trade chat for questions, credentials, and transfer evidence. Keep sensitive details out of public pages and external chats.",
              "For eFootball, follow the displayed login and email-change OTP steps. Sellers should share only the requested current code; buyers should act before it expires.",
              "The seller marks the account as transferred after completing the required handover.",
              "The buyer checks the account and confirms receipt only when satisfied. That confirmation completes escrow and releases the seller payout.",
              "If credentials, OTP, ownership, or listing details are wrong, stop the process and open a dispute before confirming receipt.",
            ]}
          />

          <GuideSection
            id="safety"
            title="Disputes, Notifications, Reviews & Support"
            intro="Use the platform records and support tools whenever something needs attention."
            icon={ShieldCheck}
            steps={[
              "Open a dispute from the affected trade, describe the issue clearly, and preserve screenshots and messages for admin review.",
              "Use Chat Admin for a private support conversation that is separate from buyer-seller trade chat.",
              "Check the notification bell for wallet, offer, trade, review, wishlist, and platform updates.",
              "Use Purchase History for completed buying activity, Seller Analytics for listing performance, and Leaderboard to compare community activity.",
              "Leave honest ratings and platform reviews after eligible activity so other users can make safer decisions.",
            ]}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            [Heart, "Wishlist", "Save and revisit accounts you are considering."],
            [Bell, "Notifications", "Follow important account and trade updates."],
            [Star, "Reviews", "Share honest feedback and check community trust."],
            [MessageCircle, "Admin Chat", "Ask the admin team for private support."],
            [CircleDollarSign, "Seller Analytics", "Track listing views, earnings, and conversion."],
            [ArrowRightLeft, "Trades & Offers", "Manage negotiations and escrow stages."],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as React.ElementType;
            return (
              <div key={title as string} className="rounded-xl border border-border bg-card p-4">
                <FeatureIcon className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{title as string}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description as string}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <HelpCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold">Need a specific answer?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search the FAQ or contact admin from your account.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild><Link href="/">Browse Listings</Link></Button>
            <Button variant="outline" asChild><Link href="/faq">Open Help & FAQ</Link></Button>
            <Button variant="outline" asChild><Link href="/kyc">Verify My ID</Link></Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}