import { useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, MessageCircle } from "lucide-react";

const FAQ_DATA = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I create an account?", a: "Click 'Register' at the top right, fill in your email, username, and password, then verify your email address." },
      { q: "How do I deposit money?", a: "Go to Wallet → Deposit. Enter your amount, click 'Submit Deposit Request', then transfer the exact amount to our Moniepoint account (9160385331, Olukoya Kolade). Include your username in the narration. Admin will confirm within 5 minutes." },
      { q: "What is the minimum deposit?", a: "Minimum deposit is ₦1,050 (₦1,000 credited to wallet + ₦50 service charge)." },
    ],
  },
  {
    category: "Buying Accounts",
    items: [
      { q: "How do I buy an account?", a: "Browse the marketplace, click 'View Details' on any listing, then click 'Buy Now – Start Escrow'. Your payment is held securely until you confirm full access to the account." },
      { q: "What happens after I pay?", a: "The seller will send you the Konami ID, password, and OTP via the trade chat. Use these to log in and change the email to your own. Once done, click 'I Have Accessed the Account' to release funds to the seller." },
      { q: "What is the escrow system?", a: "Escrow means your money is held safely on the platform and only released to the seller after you confirm you've successfully accessed the account. You can dispute if anything goes wrong." },
      { q: "Can I make an offer below the listed price?", a: "Yes! Click 'Make an Offer' on any listing and propose your price. The seller can accept, reject, or counter-offer." },
      { q: "Is my first trade free?", a: "Yes! Your first completed trade has 0% platform fee — the seller receives 100% of the sale price." },
    ],
  },
  {
    category: "Selling Accounts",
    items: [
      { q: "How do I list an account?", a: "Click 'New Listing' from your dashboard. Fill in the account details (Konami ID, password, access code), set a price, add screenshots, and publish. Your credentials are hidden from buyers until payment is confirmed." },
      { q: "Are my Konami credentials safe?", a: "100% safe. Your Konami ID and password are encrypted and hidden from everyone until a buyer's payment is confirmed. You remain in full control until the buyer confirms access." },
      { q: "When do I get paid?", a: "Funds are released to your wallet the moment the buyer clicks 'I Have Accessed the Account'. Admin then processes your withdrawal from Moniepoint within 24 hours." },
      { q: "What is the platform fee?", a: "The platform fee is a small % of each sale (shown at listing). Your first trade as a buyer is fee-free. Verified sellers may get lower fees." },
    ],
  },
  {
    category: "OTP & Access",
    items: [
      { q: "What is an OTP?", a: "OTP (One-Time Password) is a code sent to the seller's email when someone tries to log into the eFootball account. The seller shares this with the buyer via trade chat." },
      { q: "How many OTPs are there?", a: "Two OTPs are needed: the first to log in, and the second to change the email address to your own. Both are requested through buttons in the trade page." },
      { q: "What if the OTP doesn't work?", a: "Click 'Open Dispute' and describe the issue. Admin will review the chat history, test the credentials, and resolve the dispute within 24 hours." },
    ],
  },
  {
    category: "Payments & Withdrawals",
    items: [
      { q: "How do I withdraw?", a: "Go to Wallet → Withdraw. Enter your bank details and amount. Admin will transfer from Moniepoint within 24 hours and confirm in the dashboard, which deducts your balance." },
      { q: "What is the minimum withdrawal?", a: "Minimum withdrawal is ₦1,000. Maximum is ₦500,000 per day." },
      { q: "Can I withdraw during an active trade?", a: "You can withdraw any balance above your pending trade amount. For example, if you have ₦10,000 and a pending ₦7,000 trade, you can withdraw up to ₦3,000." },
      { q: "How long do withdrawals take?", a: "Standard withdrawals are processed within 24 hours. Withdrawals above ₦500,000 may take up to 48 hours for verification." },
    ],
  },
  {
    category: "Disputes & Security",
    items: [
      { q: "How do I open a dispute?", a: "On the trade page, click 'Open Dispute'. Select the reason, describe what went wrong, and choose your desired outcome (refund, partial refund, or admin review). Admin will investigate within 24 hours." },
      { q: "Can the seller log back in after I change the email?", a: "No. Once you change the email to your own using the second OTP, the seller can no longer access the account. This is why the email change step is mandatory." },
      { q: "What if I suspect fraud?", a: "Contact admin immediately via the 'Chat Admin' button (bottom-right of every page). Do not complete any trades outside the platform." },
      { q: "How is Realona safe from scams?", a: "Funds are only released after you confirm access. KYC verification adds a trust layer. All chat is monitored. Admin can reverse transactions in confirmed scam cases." },
    ],
  },
  {
    category: "Fees",
    items: [
      { q: "What fees does Realona charge?", a: "A small platform fee is applied to each trade (visible before you confirm). Your first trade is always 0% fee. Admins pay 0% on all trades." },
      { q: "Are there deposit fees?", a: "A ₦50 service charge applies to each deposit (e.g., ₦1,050 deposited = ₦1,000 in wallet)." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [search, setSearch] = useState("");

  const filtered = FAQ_DATA.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Help & FAQ</h1>
          <p className="text-muted-foreground">Everything you need to know about Realona Exchange</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No questions match "{search}"</p>
        ) : (
          <div className="space-y-8">
            {filtered.map(cat => (
              <div key={cat.category}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat.category}</h2>
                <div className="space-y-2">
                  {cat.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact support */}
        <div className="mt-12 text-center border border-border rounded-xl p-6 bg-card">
          <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">Our admin is available 8am – 10pm daily to help.</p>
          <a
            href="https://wa.me/2349160385331"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            📱 Chat on WhatsApp
          </a>
        </div>
      </div>
    </Layout>
  );
}
