---
name: Trade listing reservation
description: Rules that keep wallet-funded purchases single-winner and price-consistent.
---

Reserve the active listing, capture its current price, deduct the buyer wallet, and create the trade in one database transaction. Sellers may only toggle listings between active and paused; they must never reactivate a sold/reserved listing.

**Why:** Separate reads, wallet updates, or seller-controlled status changes allow concurrent buyers to fund multiple trades for one account or be charged a stale price.

**How to apply:** Any new purchase path or listing-status feature must preserve conditional active-to-sold reservation and conditional balance deduction in the same transaction.