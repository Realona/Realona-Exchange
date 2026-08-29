import { useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, MessageCircle } from "lucide-react";

const FAQ_DATA = [
  {
    category: "Account & Verification",
    items: [
      { q: "How do I create an account?", a: "Open Register, enter your email, username, and password, then enter the one-time code sent to your email. After verification, sign in and use your dashboard to access every marketplace feature." },
      { q: "How do I verify my identity?", a: "Open KYC Verification from your dashboard, choose your government ID type, upload a clear ID image, and optionally add a selfie for Level 2 review. Admin will review the submission and an approved account receives a blue ID Verified tick." },
      { q: "What is the difference between the two ticks?", a: "The deep-green Verified Trader tick is awarded for trusted trading activity. The blue ID Verified tick means the user's government ID was approved. A user who qualifies for both will display both ticks beside their name." },
      { q: "Why should I verify my ID?", a: "Identity verification improves trust and helps buyers and sellers trade more safely and reliably. Never treat a badge as permission to trade outside Realona—keep payment, chat, and account transfer inside the platform." },
    ],
  },
  {
    category: "Wallet & Payments",
    items: [
      { q: "How do I fund my wallet?", a: "Open Wallet, choose Deposit, enter the amount, and follow the current payment instructions shown there. Submit any proof requested. Your wallet updates after the deposit is confirmed." },
      { q: "Why must I fund my wallet before buying?", a: "Purchases are paid from your available Realona wallet balance. This lets the platform reserve the listing and move the exact current price into escrow in one protected transaction." },
      { q: "How do I withdraw?", a: "Open Wallet, choose Withdraw, enter the amount and your Nigerian bank details, then submit the request. You can track its status from the wallet page." },
      { q: "Can I withdraw money reserved for a trade?", a: "No. Funds already committed to an active trade are not available for withdrawal. Only your available wallet balance can be withdrawn." },
    ],
  },
  {
    category: "Buying, Offers & Wishlists",
    items: [
      { q: "How do I buy an account?", a: "Browse or filter the marketplace, open a listing, review its details and seller badges, then select Buy Now. You need enough available wallet balance. A successful purchase reserves the listing, deducts the current price once, and opens the escrow trade." },
      { q: "Can I make an offer?", a: "Yes. Open an available listing and submit an offer. The seller can accept, reject, or counter it. Check My Offers for updates; an accepted offer does not replace the protected checkout and escrow steps." },
      { q: "How do wishlists work?", a: "Use the heart button to save an available listing. Open My Wishlist from your dashboard to review saved accounts. You may also share your public wishlist link, and price-drop alerts appear when supported." },
      { q: "What should I check before buying?", a: "Read the full description, inspect screenshots and account details, compare the seller's ratings and badges, confirm the price, and ask questions through Realona. Never send payment outside the wallet and escrow flow." },
    ],
  },
  {
    category: "Selling & Listing Management",
    items: [
      { q: "How do I create a listing?", a: "Choose New Listing, select the account category, add accurate account details and a clear screenshot, set a price, then publish. Keep credentials correct and do not include sensitive login details in the public description." },
      { q: "How do I edit, pause, or remove a listing?", a: "Open My Listings. Active or paused listings can have their price changed. Use the status controls to pause or reactivate an available listing, and Remove to take it off the marketplace. Sold or reserved listings are protected from unsafe changes." },
      { q: "When does a seller get paid?", a: "After the buyer's wallet funds are held in escrow, the seller completes the transfer steps. The seller payout is credited only when the trade reaches successful completion, minus any fee shown by the platform." },
      { q: "Can I list several accounts?", a: "If bulk listing is enabled, use the bulk listing page to upload and review multiple accounts before submitting them together. Each account still needs accurate details and an owned screenshot." },
    ],
  },
  {
    category: "Escrow, Account Transfer & OTP",
    items: [
      { q: "What is escrow?", a: "Escrow means the buyer's wallet funds are held by the platform while the seller transfers the account. The seller is not paid until the buyer confirms successful access or an admin resolves the trade." },
      { q: "How is an eFootball account transferred?", a: "Use the trade page and its private trade chat. Follow the displayed stages for credentials, login OTP, email-change OTP, seller transfer confirmation, and buyer access confirmation. Never post credentials in public listings or external chats." },
      { q: "What if an OTP does not work?", a: "Tell the seller in the trade chat and request the correct code through the trade flow. Do not mark the account as received. If the problem continues, open a dispute so an admin can review the evidence and trade history." },
      { q: "When should I confirm receipt?", a: "Only after you can log in, confirm the account matches the listing, complete the required email or ownership change, and secure the account. Confirmation releases escrow to the seller and should not be rushed." },
    ],
  },
  {
    category: "Safety, Support & Community",
    items: [
      { q: "How do I open a dispute?", a: "Open the affected trade and choose Open Dispute before confirming receipt. Explain what happened and keep screenshots, messages, and transfer evidence inside the trade so admin can review it." },
      { q: "How do I contact admin privately?", a: "Use Chat Admin from the website. This support conversation is separate from trade chat and is visible only to you and the admin team." },
      { q: "How do reviews and ratings work?", a: "After eligible activity, use the review or rating controls to share honest feedback. Public platform reviews appear on Reviews, while trader ratings help other users make informed decisions." },
      { q: "Where do I see updates?", a: "Use the notification bell for trade, offer, review, wishlist, wallet, and platform updates. The dashboard also links to Trades, Offers, Purchase History, Seller Analytics, Leaderboard, and other account activity." },
    ],
  },
  {
    category: "Badges & Fees",
    items: [
      { q: "How is the Verified Trader badge awarded?", a: "The deep-green Verified Trader tick is controlled by Realona admins and reflects trusted trading activity. It is separate from identity verification." },
      { q: "What fees does Realona charge?", a: "The applicable deposit, trade, and withdrawal amounts are shown in the relevant wallet or trade screen. Review the displayed totals before submitting because platform settings may change." },
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
