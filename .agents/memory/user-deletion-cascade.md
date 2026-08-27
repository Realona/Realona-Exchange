---
name: User deletion cascade
description: Account deletion must explicitly clean user-owned and trade-related records because database foreign keys do not cascade.
---

# User deletion cascade

Delete user accounts only through an explicit transaction that removes dependent records before the user row. Include content owned by the user and relationship records tied to their listings and trades.

**Why:** The schema's foreign keys do not use cascading deletes. A direct user deletion fails once the account has activity, and partial manual cleanup risks orphaned marketplace data or inconsistent counters.

**How to apply:** For any account-deletion feature, discover the user's listings and trades first, remove their dependent messages, ratings, reports, offers, wishlist entries, wallet/activity records, claims, reviews, and virtual-account data, then remove trades, listings, and finally the user. Keep the operation atomic and reconcile aggregate counters such as giveaway claims.