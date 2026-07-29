import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Wallet, ArrowRightLeft, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div className="pt-1">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeeRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${highlight ? "bg-primary/10 border border-primary/20" : "bg-card border border-border"}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-bold text-sm ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Platform Guide</Badge>
          <h1 className="text-4xl font-extrabold mb-4">How Realona Works</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about buying, selling, and fees on Nigeria's trusted eFootball account marketplace.
          </p>
        </div>

        {/* Escrow Explained */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-primary/10 p-2 rounded-lg text-primary"><ShieldCheck className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">What is Escrow?</h2>
          </div>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Realona uses an <strong>escrow system</strong> to protect both buyers and sellers. When a buyer initiates a trade,
            the payment is held securely in our system — not given to the seller yet. Only after the buyer confirms they have
            full access to the eFootball account are the funds released to the seller.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This means: <strong>sellers can't run off with your money</strong>, and <strong>buyers can't claim they didn't receive the account after getting it</strong>.
            Both sides are protected.
          </p>
        </section>

        {/* For Buyers */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><ArrowRightLeft className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">For Buyers — Step by Step</h2>
          </div>
          <div className="space-y-5">
            <Step num={1} title="Deposit Funds" desc="Fund your Realona wallet by transferring to our Moniepoint escrow account (9160385331 — Olukoya Kolade). Send your payment proof to admin and your wallet is credited within 5 minutes. A ₦50 service charge applies. Minimum deposit is ₦1,000." />
            <Step num={2} title="Browse & Choose a Listing" desc="Browse eFootball accounts filtered by Division Rank and Squad Rating. View full account details before committing." />
            <Step num={3} title="Initiate a Trade" desc="Click 'Buy This Account' on a listing. This creates a secure trade between you and the seller." />
            <Step num={4} title="Confirm Payment" desc="Click 'Confirm Payment' to lock funds from your wallet into escrow. The seller is then notified to transfer the account." />
            <Step num={5} title="Receive & Verify" desc="The seller transfers the eFootball account credentials to you. Log in and verify everything is as described." />
            <Step num={6} title="Confirm Receipt" desc="Once satisfied, click 'Confirm Receipt'. Funds are immediately released to the seller. The account is yours!" />
          </div>
        </section>

        {/* For Sellers */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><CheckCircle className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">For Sellers — Step by Step</h2>
          </div>
          <div className="space-y-5">
            <Step num={1} title="Create a Listing" desc="Click 'Sell eFootball Account'. Fill in your Division Rank, Squad Rating, price, description, and an account screenshot URL." />
            <Step num={2} title="Wait for a Buyer" desc="Your listing goes live immediately. Interested buyers can contact you through the trade chat." />
            <Step num={3} title="Buyer Confirms Payment" desc="When a buyer locks funds into escrow, you'll receive an email notification. Funds are safely held — not yet released." />
            <Step num={4} title="Transfer the Account" desc="Transfer your eFootball account login credentials to the buyer via the secure trade chat. Then click 'Mark as Transferred'." />
            <Step num={5} title="Get Paid" desc="Once the buyer confirms receipt, funds (minus the platform fee) are instantly credited to your Realona Exchange wallet." />
            <Step num={6} title="Withdraw" desc="Withdraw your wallet balance to any Nigerian bank account at any time." />
          </div>
        </section>

        {/* Fees */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500"><Wallet className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">Fees & Charges</h2>
          </div>
          <div className="space-y-3 mb-6">
            <FeeRow label="Deposit service charge" value="₦50 flat (deducted from every deposit)" highlight />
            <FeeRow label="Minimum deposit" value="₦1,000 per deposit" />
            <FeeRow label="Platform fee on completed trades" value="4% of sale price (deducted from seller payout)" highlight />
            <FeeRow label="Withdrawal fee" value="Free — no charge" />
            <FeeRow label="Listing fee" value="Free — no charge to list" />
          </div>

          {/* Important deposit notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Important — Deposit Extra to Cover the Charge</p>
                <p className="text-sm text-muted-foreground">
                  Because ₦50 is deducted from every deposit, always send <strong>₦50 more than you need</strong>.
                  For example, if you want ₦5,000 in your wallet, deposit ₦5,050. If you want to buy a ₦15,000 account, deposit ₦15,050.
                </p>
              </div>
            </div>
          </div>

          {/* Trade fee notice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Seller Payout Example</p>
                <p className="text-sm text-muted-foreground">
                  If your eFootball account sells for <strong>₦50,000</strong>, the 4% platform fee is ₦2,000.
                  You receive <strong>₦48,000</strong> in your Realona wallet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Disputes */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-red-500/10 p-2 rounded-lg text-red-500"><AlertCircle className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">Disputes & Protection</h2>
          </div>
          <p className="text-muted-foreground mb-3 leading-relaxed">
            If there is a problem with a trade — the account wasn't as described, login details don't work, or either party is unresponsive — either side can open a <strong>Dispute</strong> on the trade.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our admin team will review the case and reach a fair resolution. Funds are held in escrow until the dispute is resolved — nobody loses money without a proper review.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center border-t border-border pt-10">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Join hundreds of eFootball traders on Nigeria's most trusted platform.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild><Link href="/register">Create Free Account</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/">Browse Listings</Link></Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
