---
name: First-trade fee logic
description: First completed trade as buyer gets 0% fee; admin/superadmin always pay 0%.
---

Before computing fee in `POST /trades` (create trade):
1. Count buyer's completed trades: `SELECT COUNT(*) FROM trades WHERE buyer_id = userId AND status = 'completed'`
2. If count == 0 → `fee = 0` (first trade free)
3. If `req.user.isAdmin || req.user.isSuperAdmin` → `fee = 0`
4. Otherwise → `fee = amount * feePercent / 100`

**Why:** Per product spec from PDFs — first-time buyers get a fee waiver to encourage adoption; admin accounts should never be charged.

**How to apply:** Apply this logic in trades.ts before the `INSERT INTO trades` call.
