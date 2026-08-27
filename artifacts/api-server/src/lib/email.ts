import { ReplitConnectors } from "@replit/connectors-sdk";
import nodemailer from "nodemailer";

const RESEND_FROM = process.env.RESEND_FROM_EMAIL;
const GMAIL_FROM = process.env.EMAIL_FROM ?? "realonabusinessexchange@gmail.com";
const APP_URL = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:80";

function gmailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr><td style="background:#1a56db;padding:20px 32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#fff;border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
              <span style="font-weight:900;font-size:18px;color:#1a56db;">R</span>
            </td>
            <td style="padding-left:10px;color:#fff;font-size:20px;font-weight:700;vertical-align:middle;">Realona <span style="color:#f59e0b;">Exchange</span></td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">${title}</h2>
          ${body}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">Nigeria's most trusted game account marketplace · <a href="${APP_URL}" style="color:#1a56db;text-decoration:none;">Realona Exchange</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function p(text: string) {
  return `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function btn(text: string, url: string) {
  return `<p style="margin:24px 0;"><a href="${url}" style="background:#1a56db;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">${text}</a></p>`;
}

function badge(label: string, value: string) {
  return `<tr><td style="color:#64748b;font-size:13px;padding:6px 0;">${label}</td><td style="color:#1e293b;font-size:13px;font-weight:600;padding:6px 0;">${value}</td></tr>`;
}

function table(rows: string) {
  return `<table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;box-sizing:border-box;">${rows}</table>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (RESEND_FROM) {
    try {
      const connectors = new ReplitConnectors();
      const response = await connectors.proxy("resend", "/emails", {
        method: "POST",
        body: {
          from: RESEND_FROM,
          to: [to],
          subject,
          html,
        },
      });

      if (response.ok) return true;

      const details = await response.text().catch(() => "");
      console.error(`[email] Resend failed (${response.status})${details ? `: ${details}` : ""}`);
    } catch (err: any) {
      console.error("[email] Resend failed:", err?.message);
    }
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.error("[email] no working delivery transport is configured");
    return false;
  }

  try {
    await gmailTransporter().sendMail({
      from: `"Realona Exchange" <${GMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err: any) {
    console.error("[email] Gmail fallback failed:", err?.message);
    return false;
  }
}

// ─── Trade emails ────────────────────────────────────────────────────────────

export async function emailBuyerPaid(opts: {
  adminEmail: string;
  buyerUsername: string; sellerUsername: string;
  gameName: string; amount: number; tradeId: number;
}) {
  const url = `${APP_URL}/admin/trades`;
  await send(
    opts.adminEmail,
    `💰 Payment notification — Trade #${opts.tradeId} needs confirmation`,
    base(
      "A buyer has made payment",
      p(`<strong>${opts.buyerUsername}</strong> has notified you that they have sent payment for Trade #${opts.tradeId}. Please verify the transfer on your Moniepoint account and confirm.`) +
      table(
        badge("Trade ID", `#${opts.tradeId}`) +
        badge("Listing", opts.gameName) +
        badge("Amount", `₦${opts.amount.toLocaleString()}`) +
        badge("Buyer", opts.buyerUsername) +
        badge("Seller", opts.sellerUsername)
      ) +
      p("Once you have verified the bank transfer, go to the Trades panel and click <strong>Confirm Payment</strong> to release funds from escrow.") +
      btn("Review Trade", url)
    )
  );
}

export async function emailTradeCreated(opts: {
  sellerEmail: string; sellerUsername: string;
  buyerUsername: string; gameName: string;
  amount: number; tradeId: number;
}) {
  const url = `${APP_URL}/trades/${opts.tradeId}`;
  await send(
    opts.sellerEmail,
    `New trade enquiry — ${opts.gameName}`,
    base(
      "You have a new trade enquiry!",
      p(`Hi <strong>${opts.sellerUsername}</strong>, <strong>${opts.buyerUsername}</strong> wants to buy your <strong>${opts.gameName}</strong> listing.`) +
      table(
        badge("Trade ID", `#${opts.tradeId}`) +
        badge("Game", opts.gameName) +
        badge("Amount", `₦${opts.amount.toLocaleString()}`)
      ) +
      p("The buyer needs to confirm payment. Once payment is confirmed, you will be notified to transfer the account.") +
      btn("View Trade", url)
    )
  );
}

export async function emailPaymentConfirmed(opts: {
  sellerEmail: string; sellerUsername: string;
  buyerUsername: string; gameName: string;
  amount: number; tradeId: number;
}) {
  const url = `${APP_URL}/trades/${opts.tradeId}`;
  await send(
    opts.sellerEmail,
    `Payment confirmed — please transfer ${opts.gameName}`,
    base(
      "Payment confirmed — transfer the account now",
      p(`Hi <strong>${opts.sellerUsername}</strong>, <strong>${opts.buyerUsername}</strong> has confirmed payment for your <strong>${opts.gameName}</strong> listing.`) +
      table(
        badge("Trade ID", `#${opts.tradeId}`) +
        badge("Amount held in escrow", `₦${opts.amount.toLocaleString()}`) +
        badge("Game", opts.gameName)
      ) +
      p("Funds are now held in escrow. Please transfer the game account credentials to the buyer, then click <strong>Mark as Transferred</strong> in the trade.") +
      btn("Go to Trade", url)
    )
  );
}

export async function emailSellerTransferred(opts: {
  buyerEmail: string; buyerUsername: string;
  sellerUsername: string; gameName: string;
  tradeId: number;
}) {
  const url = `${APP_URL}/trades/${opts.tradeId}`;
  await send(
    opts.buyerEmail,
    `Account transferred — confirm receipt for ${opts.gameName}`,
    base(
      "The seller has transferred the account!",
      p(`Hi <strong>${opts.buyerUsername}</strong>, <strong>${opts.sellerUsername}</strong> has transferred the <strong>${opts.gameName}</strong> account to you.`) +
      table(badge("Trade ID", `#${opts.tradeId}`) + badge("Game", opts.gameName)) +
      p("Please log into the game account and verify everything is as described. Once satisfied, click <strong>Confirm Receipt</strong> to release payment to the seller.") +
      p("<strong style='color:#f59e0b;'>⚠️ Do not confirm receipt until you have fully verified access to the account.</strong>") +
      btn("Confirm Receipt", url)
    )
  );
}

export async function emailTradeCompleted(opts: {
  sellerEmail: string; sellerUsername: string;
  buyerEmail: string; buyerUsername: string;
  gameName: string; sellerAmount: number; tradeId: number;
}) {
  const url = `${APP_URL}/trades/${opts.tradeId}`;
  await Promise.all([
    send(
      opts.sellerEmail,
      `Trade completed — ₦${opts.sellerAmount.toLocaleString()} released to your wallet`,
      base(
        "Trade completed! Funds released.",
        p(`Hi <strong>${opts.sellerUsername}</strong>, your trade for <strong>${opts.gameName}</strong> is complete.`) +
        table(
          badge("Trade ID", `#${opts.tradeId}`) +
          badge("Credited to wallet", `₦${opts.sellerAmount.toLocaleString()}`)
        ) +
        p("Your funds are now in your Realona wallet. You can withdraw them to your bank account at any time.") +
        btn("Go to Wallet", `${APP_URL}/wallet`)
      )
    ),
    send(
      opts.buyerEmail,
      `Trade completed — ${opts.gameName} is yours`,
      base(
        "Trade completed successfully!",
        p(`Hi <strong>${opts.buyerUsername}</strong>, your purchase of <strong>${opts.gameName}</strong> is complete. Enjoy!`) +
        table(badge("Trade ID", `#${opts.tradeId}`) + badge("Game", opts.gameName)) +
        btn("View Trade", url)
      )
    ),
  ]);
}

export async function emailDisputeOpened(opts: {
  adminEmail?: string;
  buyerUsername: string; sellerUsername: string;
  gameName: string; reason: string; tradeId: number;
  openerEmail: string; openerUsername: string;
  otherEmail: string; otherUsername: string;
}) {
  const url = `${APP_URL}/trades/${opts.tradeId}`;
  await Promise.all([
    ...(opts.adminEmail ? [send(
      opts.adminEmail,
      `⚠️ Dispute opened on Trade #${opts.tradeId}`,
      base(
        "A dispute has been opened",
        p(`A dispute was opened on Trade #${opts.tradeId} between <strong>${opts.buyerUsername}</strong> (buyer) and <strong>${opts.sellerUsername}</strong> (seller).`) +
        table(
          badge("Trade ID", `#${opts.tradeId}`) +
          badge("Game", opts.gameName) +
          badge("Reason", opts.reason)
        ) +
        btn("Review Trade", `${APP_URL}/admin`)
      )
    )] : []),
    send(
      opts.openerEmail,
      `Dispute filed — Trade #${opts.tradeId}`,
      base(
        "Your dispute has been filed",
        p(`Hi <strong>${opts.openerUsername}</strong>, your dispute for Trade #${opts.tradeId} has been filed. Our admin team will review and resolve it shortly.`) +
        table(badge("Reason filed", opts.reason)) +
        btn("View Trade", url)
      )
    ),
    send(
      opts.otherEmail,
      `Dispute opened on Trade #${opts.tradeId}`,
      base(
        "A dispute has been opened on your trade",
        p(`Hi <strong>${opts.otherUsername}</strong>, a dispute has been filed on Trade #${opts.tradeId}. Our admin team will review and resolve it.`) +
        table(badge("Reason", opts.reason)) +
        btn("View Trade", url)
      )
    ),
  ]);
}

// ─── Withdrawal emails ───────────────────────────────────────────────────────

export async function emailWithdrawalRequested(opts: {
  adminEmail: string; username: string; amount: number;
  bankName: string; accountNumber: string; accountName: string;
  withdrawalId: number;
}) {
  await send(
    opts.adminEmail,
    `Withdrawal request — ₦${opts.amount.toLocaleString()} from ${opts.username}`,
    base(
      "New withdrawal request",
      p(`<strong>${opts.username}</strong> has requested a withdrawal.`) +
      table(
        badge("Amount", `₦${opts.amount.toLocaleString()}`) +
        badge("Bank", opts.bankName) +
        badge("Account number", opts.accountNumber) +
        badge("Account name", opts.accountName)
      ) +
      btn("Review Withdrawals", `${APP_URL}/admin/withdrawals`)
    )
  );
}

export async function emailWithdrawalApproved(opts: {
  userEmail: string; username: string; amount: number;
  bankName: string; accountName: string;
}) {
  await send(
    opts.userEmail,
    `Withdrawal approved — ₦${opts.amount.toLocaleString()} sent`,
    base(
      "Your withdrawal has been approved!",
      p(`Hi <strong>${opts.username}</strong>, your withdrawal has been approved and is being sent to your bank.`) +
      table(
        badge("Amount", `₦${opts.amount.toLocaleString()}`) +
        badge("Bank", opts.bankName) +
        badge("Account name", opts.accountName)
      ) +
      p("Bank transfers typically arrive within 1–3 business hours.") +
      btn("Go to Wallet", `${APP_URL}/wallet`)
    )
  );
}

export async function emailWithdrawalRejected(opts: {
  userEmail: string; username: string; amount: number; reason: string;
}) {
  await send(
    opts.userEmail,
    `Withdrawal declined — ₦${opts.amount.toLocaleString()}`,
    base(
      "Your withdrawal was declined",
      p(`Hi <strong>${opts.username}</strong>, unfortunately your withdrawal request was not approved.`) +
      table(
        badge("Amount", `₦${opts.amount.toLocaleString()}`) +
        badge("Reason", opts.reason)
      ) +
      p("Your funds have been returned to your Realona wallet. Please contact support if you believe this is an error.") +
      btn("Go to Wallet", `${APP_URL}/wallet`)
    )
  );
}

// ─── Auth emails ─────────────────────────────────────────────────────────────

export async function emailVerifiedBadgeGranted(opts: { email: string; username: string }) {
  await send(
    opts.email,
    "🏅 You're now a Verified Trader on Realona Exchange!",
    base(
      "You've been verified!",
      p(`Hi <strong>${opts.username}</strong>, congratulations — you have been granted the <strong>Verified Trader</strong> badge on Realona Exchange!`) +
      table(
        badge("Badge", "✅ Verified Trader") +
        badge("Effect", "Your listings now appear in Verified Sellers filters")
      ) +
      p("Buyers actively filter for Verified Traders, so your listings will get more visibility. Keep up the great work!") +
      btn("View My Listings", `${APP_URL}/my-listings`)
    )
  );
}

export async function emailVerifiedBadgeRevoked(opts: { email: string; username: string }) {
  await send(
    opts.email,
    "Your Verified Trader badge has been removed",
    base(
      "Verified Trader badge removed",
      p(`Hi <strong>${opts.username}</strong>, your Verified Trader badge on Realona Exchange has been removed by the admin team.`) +
      p("Your listings are still active and visible on the marketplace. If you believe this was a mistake, please contact support via the chat button on the site.") +
      btn("Go to Realona Exchange", APP_URL)
    )
  );
}

export async function emailOtp(opts: { email: string; username: string; otp: string }) {
  // Always log to console in non-production so registration can be tested
  // even when Gmail credentials are not yet configured
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  OTP VERIFICATION CODE (DEV MODE)    ║`);
    console.log(`║  Email : ${opts.email.padEnd(28)}║`);
    console.log(`║  Code  : ${opts.otp.padEnd(28)}║`);
    console.log(`╚══════════════════════════════════════╝\n`);
  }
  await send(
    opts.email,
    "Your Realona verification code",
    base(
      "Verify your email address",
      p(`Hi <strong>${opts.username}</strong>, thanks for registering on Realona Exchange!`) +
      p("Enter the code below to complete your registration. It expires in <strong>10 minutes</strong>.") +
      `<div style="text-align:center;margin:28px 0;">
        <div style="display:inline-block;background:#eff6ff;border:2px solid #1a56db;border-radius:12px;padding:20px 40px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1a56db;font-family:monospace;">${opts.otp}</span>
        </div>
      </div>` +
      p("If you did not create an account on Realona Exchange, you can safely ignore this email.")
    )
  );
}

export async function emailNotification(opts: {
  email: string; username: string; title: string; message: string; linkUrl?: string; linkText?: string;
}) {
  const linkTarget = opts.linkUrl?.startsWith("/") ? `${APP_URL}${opts.linkUrl}` : (opts.linkUrl ?? APP_URL);
  const linkLabel = opts.linkText ?? "Open Realona Exchange";
  return send(
    opts.email,
    escapeHtml(opts.title),
    base(
      escapeHtml(opts.title),
      p(`Hi <strong>${escapeHtml(opts.username)}</strong>,`) +
      p(escapeHtml(opts.message)) +
      btn(escapeHtml(linkLabel), escapeHtml(linkTarget))
    )
  );
}

export async function emailWelcome(opts: { email: string; username: string }) {
  await send(
    opts.email,
    "Welcome to Realona Exchange!",
    base(
      `Welcome, ${opts.username}!`,
      p("You're now part of Nigeria's most trusted game account marketplace.") +
      p("You can browse listings, buy or sell game accounts, and withdraw your earnings directly to your Nigerian bank account — all secured by our escrow system.") +
      btn("Start Exploring", APP_URL)
    )
  );
}
