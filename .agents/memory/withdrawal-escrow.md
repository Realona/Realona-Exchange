---
name: Withdrawal escrow logic
description: How to compute available withdrawal balance when user has active trades.
---

The rule: `availableBalance = walletBalance - sum(trade.amount for pending buyer trades)`

- `pending` trades (buyer hasn't confirmed payment yet) → wallet NOT yet deducted → subtract from available
- `payment_confirmed`, `seller_transferred`, `disputed` → wallet already deducted at confirm-payment → do NOT subtract again

**Why:** The wallet deduction happens in `POST /trades/:id/confirm-payment` (line: `walletBalance -= trade.amount`). So payment_confirmed+ trades are already reflected in the displayed balance.

**How to apply:** In withdrawals.ts, query only `status = 'pending'` buyer trades for escrow calculation. Never block all withdrawals when active trades exist — only limit excess.
